import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  ScholarshipCreated
} from "../generated/ScholarshipFactory/ScholarshipFactory"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createScholarshipCreatedEvent(
  scholarshipAddress: Address,
  company: Address,
  scholarshipTitle: string,
  totalAmount: BigInt,
  scholarshipId: BigInt
): ScholarshipCreated {
  let scholarshipCreatedEvent = changetype<ScholarshipCreated>(newMockEvent())

  scholarshipCreatedEvent.parameters = new Array()

  scholarshipCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "scholarshipAddress",
      ethereum.Value.fromAddress(scholarshipAddress)
    )
  )
  scholarshipCreatedEvent.parameters.push(
    new ethereum.EventParam("company", ethereum.Value.fromAddress(company))
  )
  scholarshipCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "scholarshipTitle",
      ethereum.Value.fromString(scholarshipTitle)
    )
  )
  scholarshipCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "totalAmount",
      ethereum.Value.fromUnsignedBigInt(totalAmount)
    )
  )
  scholarshipCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "scholarshipId",
      ethereum.Value.fromUnsignedBigInt(scholarshipId)
    )
  )

  return scholarshipCreatedEvent
}
