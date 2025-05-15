import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ScholarshipCreated as ScholarshipCreatedEvent
} from "../generated/ScholarshipFactory/ScholarshipFactory"
import { OwnershipTransferred, ScholarshipCreated } from "../generated/schema"

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleScholarshipCreated(event: ScholarshipCreatedEvent): void {
  let entity = new ScholarshipCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.scholarshipAddress = event.params.scholarshipAddress
  entity.company = event.params.company
  entity.scholarshipTitle = event.params.scholarshipTitle
  entity.totalAmount = event.params.totalAmount
  entity.scholarshipId = event.params.scholarshipId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
