import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ScholarshipCreated as ScholarshipCreatedEvent,
} from '../generated/ScholarshipFactory/ScholarshipFactory';
import { Scholarship as ScholarshipContract } from '../generated/templates/Scholarship/Scholarship';
import { Scholarship as ScholarshipTemplate } from '../generated/templates';
import {
  OwnershipTransferred,
  ScholarshipCreated,
  Company,
  Scholarship,
  Milestone,
} from '../generated/schema';
import { BigInt, Bytes, BigDecimal } from '@graphprotocol/graph-ts';

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleScholarshipCreated(event: ScholarshipCreatedEvent): void {
  // Create ScholarshipCreated entity
  let scholarshipCreatedEntity = new ScholarshipCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  scholarshipCreatedEntity.scholarshipAddress = event.params.scholarshipAddress;
  scholarshipCreatedEntity.company = event.params.company;
  scholarshipCreatedEntity.scholarshipTitle = event.params.scholarshipTitle;
  scholarshipCreatedEntity.totalAmount = event.params.totalAmount;
  scholarshipCreatedEntity.scholarshipId = event.params.scholarshipId;
  scholarshipCreatedEntity.blockNumber = event.block.number;
  scholarshipCreatedEntity.blockTimestamp = event.block.timestamp;
  scholarshipCreatedEntity.transactionHash = event.transaction.hash;

  // Get or create Company entity
  let companyId = event.params.company;
  let company = Company.load(companyId);
  if (company == null) {
    company = new Company(companyId);
    company.totalScholarships = 0;
    company.totalFunding = BigInt.fromI32(0);
    company.totalFundingReleased = BigInt.fromI32(0);
    company.totalFundingRemaining = BigInt.fromI32(0);
    company.totalApprovedScholars = 0;
    company.totalActiveScholars = 0;
    company.createdAt = event.block.timestamp;
  }
  company.totalScholarships += 1;
  company.totalFunding = company.totalFunding.plus(event.params.totalAmount);
  company.totalFundingRemaining = company.totalFundingRemaining.plus(
    event.params.totalAmount
  );
  company.updatedAt = event.block.timestamp;
  company.save();

  // Create Scholarship contract instance to get more details
  let scholarshipContract = ScholarshipContract.bind(
    event.params.scholarshipAddress
  );

  // Create Scholarship entity
  let scholarship = new Scholarship(event.params.scholarshipAddress);
  scholarship.scholarshipId = event.params.scholarshipId;
  scholarship.title = event.params.scholarshipTitle;

  // Try to fetch additional details from the contract
  let descriptionResult = scholarshipContract.try_description();
  if (!descriptionResult.reverted) {
    scholarship.description = descriptionResult.value;
  } else {
    scholarship.description = '';
  }

  let eligibilityResult = scholarshipContract.try_eligibility();
  if (!eligibilityResult.reverted) {
    scholarship.gpa = eligibilityResult.value.getGpa();
    scholarship.additionalRequirements =
      eligibilityResult.value.getAdditionalRequirements();
  } else {
    scholarship.gpa = BigInt.fromI32(0);
    scholarship.additionalRequirements = '';
  }

  let deadlineResult = scholarshipContract.try_deadline();
  if (!deadlineResult.reverted) {
    scholarship.deadline = deadlineResult.value;
  } else {
    scholarship.deadline = BigInt.fromI32(0);
  }

  let statusResult = scholarshipContract.try_status();
  if (!statusResult.reverted) {
    scholarship.status = statusResult.value;
  } else {
    scholarship.status = 0; // Default to Open
  }

  let totalMilestonesResult = scholarshipContract.try_getTotalMilestones();
  let totalMilestones = 0;
  if (!totalMilestonesResult.reverted) {
    totalMilestones = totalMilestonesResult.value.toI32();
  }

  scholarship.totalAmount = event.params.totalAmount;
  scholarship.remainingAmount = event.params.totalAmount;
  scholarship.company = companyId;
  scholarship.totalMilestones = totalMilestones;
  scholarship.completedMilestones = 0;
  scholarship.completionPercentage = BigDecimal.fromString('0');
  scholarship.createdAt = event.block.timestamp;
  scholarship.updatedAt = event.block.timestamp;
  scholarship.save();

  // Link the ScholarshipCreated entity to the Scholarship entity
  scholarshipCreatedEntity.scholarship = event.params.scholarshipAddress;
  scholarshipCreatedEntity.save();

  // Create milestones for this scholarship
  for (let i = 0; i < totalMilestones; i++) {
    let milestoneId =
      event.params.scholarshipAddress.toHexString() + '-' + i.toString();
    let milestoneResult = scholarshipContract.try_getMilestone(
      BigInt.fromI32(i)
    );

    if (!milestoneResult.reverted) {
      let milestone = new Milestone(milestoneId);
      milestone.scholarship = event.params.scholarshipAddress;
      milestone.milestoneId = BigInt.fromI32(i);
      milestone.title = milestoneResult.value.getTitleReturn();
      milestone.amount = milestoneResult.value.getAmount();
      milestone.isCompleted = milestoneResult.value.getIsCompleted();
      milestone.fundsReleased = milestoneResult.value.getFundsReleased();
      milestone.createdAt = event.block.timestamp;
      milestone.save();
    }
  }

  // Start tracking this contract's events
  ScholarshipTemplate.create(event.params.scholarshipAddress);
}
