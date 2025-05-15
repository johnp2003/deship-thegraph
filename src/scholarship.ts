import {
  StudentApplied as StudentAppliedEvent,
  StudentApproved as StudentApprovedEvent,
  MilestoneCompleted as MilestoneCompletedEvent,
  FundsReleased as FundsReleasedEvent,
  ScholarshipStatusUpdated as ScholarshipStatusUpdatedEvent,
  ScholarshipDetailsUpdated as ScholarshipDetailsUpdatedEvent
} from "../generated/templates/Scholarship/Scholarship"
import { Scholarship as ScholarshipContract } from "../generated/templates/Scholarship/Scholarship"
import {
  Scholar,
  Scholarship,
  Milestone,
  Transaction,
  Company
} from "../generated/schema"
import { BigInt, Bytes, BigDecimal, Address } from "@graphprotocol/graph-ts"

// Helper function to update completion percentages
function updateCompletionPercentages(
  scholarshipAddress: Address,
  studentAddress: Address | null = null
): void {
  let scholarship = Scholarship.load(scholarshipAddress)
  if (!scholarship) return

  // Update scholarship completion percentage
  if (scholarship.totalMilestones > 0) {
    scholarship.completionPercentage = BigDecimal.fromString(
      scholarship.completedMilestones.toString()
    ).div(BigDecimal.fromString(scholarship.totalMilestones.toString()))
      .times(BigDecimal.fromString("100"))
    scholarship.save()
  }

  // Update student completion percentage if provided
  if (studentAddress) {
    let scholar = Scholar.load(studentAddress)
    if (scholar && scholar.totalMilestones > 0) {
      scholar.completionPercentage = BigDecimal.fromString(
        scholar.completedMilestones.toString()
      ).div(BigDecimal.fromString(scholar.totalMilestones.toString()))
        .times(BigDecimal.fromString("100"))
      scholar.save()
    }
  }
}

export function handleStudentApplied(event: StudentAppliedEvent): void {
  let scholarshipAddress = event.address
  let studentAddress = event.params.student
  
  // Get or create Scholar
  let scholar = Scholar.load(studentAddress)
  if (!scholar) {
    scholar = new Scholar(studentAddress)
    scholar.appliedScholarships = []
    scholar.approvedScholarships = []
    scholar.totalFundingReceived = BigInt.fromI32(0)
    scholar.isActive = false
    scholar.completedMilestones = 0
    scholar.totalMilestones = 0
    scholar.completionPercentage = BigDecimal.fromString("0")
    scholar.createdAt = event.block.timestamp
  }
  
  // Add this scholarship to the scholar's applied list if not already there
  let appliedScholarships = scholar.appliedScholarships
  if (!appliedScholarships.includes(scholarshipAddress)) {
    appliedScholarships.push(scholarshipAddress)
    scholar.appliedScholarships = appliedScholarships
  }
  
  scholar.updatedAt = event.block.timestamp
  scholar.save()
}

export function handleStudentApproved(event: StudentApprovedEvent): void {
  let scholarshipAddress = event.address
  let studentAddress = event.params.student
  
  // Get scholar and scholarship
  let scholar = Scholar.load(studentAddress)
  let scholarship = Scholarship.load(scholarshipAddress)
  
  if (!scholar || !scholarship) return
  
  // Add this scholarship to the scholar's approved list if not already there
  let approvedScholarships = scholar.approvedScholarships
  if (!approvedScholarships.includes(scholarshipAddress)) {
    approvedScholarships.push(scholarshipAddress)
    scholar.approvedScholarships = approvedScholarships
    scholar.isActive = true
    
    // Add milestones to student's total
    scholar.totalMilestones += scholarship.totalMilestones
  }
  
  scholar.updatedAt = event.block.timestamp
  scholar.save()
  
  // Update company stats
  let company = Company.load(scholarship.company)
  if (company) {
    company.totalApprovedScholars += 1
    company.totalActiveScholars += 1
    company.updatedAt = event.block.timestamp
    company.save()
  }
}

export function handleMilestoneCompleted(event: MilestoneCompletedEvent): void {
  let scholarshipAddress = event.address
  let studentAddress = event.params.student
  let milestoneId = event.params.milestoneId
  
  // Construct milestone ID
  let milestoneIdString = scholarshipAddress.toHexString() + "-" + milestoneId.toString()
  let milestone = Milestone.load(milestoneIdString)
  
  if (!milestone) return
  
  // Update milestone
  milestone.student = studentAddress
  milestone.isCompleted = true
  milestone.completedAt = event.block.timestamp
  milestone.save()
  
  // Update scholarship completion stats
  let scholarship = Scholarship.load(scholarshipAddress)
  if (scholarship) {
    scholarship.completedMilestones += 1
    scholarship.updatedAt = event.block.timestamp
    scholarship.save()
  }
  
  // Update scholar completion stats
  let scholar = Scholar.load(studentAddress)
  if (scholar) {
    scholar.completedMilestones += 1
    scholar.updatedAt = event.block.timestamp
    scholar.save()
  }
  
  // Update completion percentages
  updateCompletionPercentages(scholarshipAddress, studentAddress)
}

export function handleFundsReleased(event: FundsReleasedEvent): void {
  let scholarshipAddress = event.address
  let studentAddress = event.params.student
  let amount = event.params.amount
  let milestoneId = event.params.milestoneId
  
  // Create transaction record
  let transaction = new Transaction(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  transaction.scholarship = scholarshipAddress
  transaction.student = studentAddress
  transaction.milestone = scholarshipAddress.toHexString() + "-" + milestoneId.toString()
  transaction.amount = amount
  transaction.milestoneId = milestoneId
  transaction.blockNumber = event.block.number
  transaction.blockTimestamp = event.block.timestamp
  transaction.transactionHash = event.transaction.hash
  transaction.save()
  
  // Update milestone
  let milestoneIdString = scholarshipAddress.toHexString() + "-" + milestoneId.toString()
  let milestone = Milestone.load(milestoneIdString)
  if (milestone) {
    milestone.fundsReleased = true
    milestone.fundReleasedAt = event.block.timestamp
    milestone.save()
  }
  
  // Update scholar
  let scholar = Scholar.load(studentAddress)
  if (scholar) {
    scholar.totalFundingReceived = scholar.totalFundingReceived.plus(amount)
    scholar.updatedAt = event.block.timestamp
    scholar.save()
  }
  
  // Update scholarship
  let scholarship = Scholarship.load(scholarshipAddress)
  if (scholarship) {
    scholarship.remainingAmount = scholarship.remainingAmount.minus(amount)
    scholarship.updatedAt = event.block.timestamp
    scholarship.save()
    
    // Update company stats
    let company = Company.load(scholarship.company)
    if (company) {
      company.totalFundingReleased = company.totalFundingReleased.plus(amount)
      company.totalFundingRemaining = company.totalFundingRemaining.minus(amount)
      company.updatedAt = event.block.timestamp
      company.save()
    }
  }
}

export function handleScholarshipStatusUpdated(event: ScholarshipStatusUpdatedEvent): void {
  let scholarshipAddress = event.address
  let newStatus = event.params.status
  
  let scholarship = Scholarship.load(scholarshipAddress)
  if (!scholarship) return
  
  scholarship.status = newStatus
  scholarship.updatedAt = event.block.timestamp
  scholarship.save()
  
  // If scholarship is closed or expired, update active scholars count
  if (newStatus != 0) { // Not open
    let company = Company.load(scholarship.company)
    if (!company) return
    
    // Get contract to check how many approved scholars there are
    let scholarshipContract = ScholarshipContract.bind(scholarshipAddress)
    
    // Get the total count of approved students by starting with index 0 and
    // incrementing until we get a revert, which means we've reached the end of the array
    let approvedStudents: Address[] = []
    let index = BigInt.fromI32(0)
    let maxIterations = 100 // Safety limit to prevent infinite loops
    let iterations = 0
    
    while (iterations < maxIterations) {
      let tryResult = scholarshipContract.try_approvedStudents(index)
      if (tryResult.reverted) {
        break // End of the array reached
      }
      
      // Only add non-zero addresses
      if (!tryResult.value.equals(Address.zero())) {
        approvedStudents.push(tryResult.value)
      }
      
      index = index.plus(BigInt.fromI32(1))
      iterations++
    }
    
    let totalApprovedStudents = approvedStudents.length
    
    if (totalApprovedStudents > 0) {
      company.totalActiveScholars -= totalApprovedStudents
      if (company.totalActiveScholars < 0) company.totalActiveScholars = 0
      company.updatedAt = event.block.timestamp
      company.save()
      
      // Mark scholars as inactive
      for (let i = 0; i < approvedStudents.length; i++) {
        let studentAddress = approvedStudents[i]
        let scholar = Scholar.load(studentAddress)
        if (scholar) {
          scholar.isActive = false
          scholar.updatedAt = event.block.timestamp
          scholar.save()
        }
      }
    }
  }
}

export function handleScholarshipDetailsUpdated(event: ScholarshipDetailsUpdatedEvent): void {
  let scholarshipAddress = event.address
  
  let scholarship = Scholarship.load(scholarshipAddress)
  if (!scholarship) return
  
  scholarship.title = event.params.newTitle
  scholarship.description = event.params.newDescription
  scholarship.gpa = event.params.newGpa
  scholarship.additionalRequirements = event.params.newAdditionalRequirements
  scholarship.deadline = event.params.newDeadline
  scholarship.updatedAt = event.block.timestamp
  scholarship.save()
}