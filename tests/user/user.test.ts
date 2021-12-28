import { test, assert, clearStore, logStore, newMockEvent, createMockedFunction } from "matchstick-as/assembly/index"
import { handleNewUser } from "../../src/mapping"
import { newUser } from "../../src/user"
import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import { User } from "../../generated/schema"
import { UserCreated } from "../../generated/Peeranha/Peeranha"

test("Save initial User test", () => {
  
    let user = new User("newID");
    user.save();

    assert.fieldEquals("User", "newID", "id", "newID");
    
    clearStore();
})

test("Test handleNewUser", () => {
  let USER_ADDRESS = Address.fromString("0xf1cc7ebcd6f3c7ce4e88cca495917ccf33fc8736")
  let CONTRACT_ADDRESS = Address.fromString("0x8156DDef53905b3c837a97D51D30750293021e50")

  let mockedUserCreatedEvent = addMockedEvent(USER_ADDRESS);

  addMockedFunction(USER_ADDRESS, CONTRACT_ADDRESS);

  handleNewUser(mockedUserCreatedEvent);

  assert.fieldEquals("User", USER_ADDRESS.toHex(), "creationTime", "1234");
  assert.fieldEquals("User", USER_ADDRESS.toHex(), "rating", "10");
  assert.fieldEquals("User", USER_ADDRESS.toHex(), "ipfsHash", getHashContainer()[0]);
  assert.fieldEquals("User", USER_ADDRESS.toHex(), "ipfsHash2", getHashContainer()[0]);
  // assert.fieldEquals("User", USER_ADDRESS.toHex(), "displayName", "TestUser3");
})

function getHashContainer(): string[] {
    return [
      "0xbf716ff771127602d1db2d5fae85f0a99e853bd8d6bbe42a018a68386514b109",
      "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    ];
}

function addMockedEvent(userAddress: Address): UserCreated {
  let newUserCreatedEvent = changetype<UserCreated>(newMockEvent())

  newUserCreatedEvent.parameters = new Array();
  let userAddressParam = new ethereum.EventParam("userAddress", ethereum.Value.fromAddress(userAddress))
  newUserCreatedEvent.parameters.push(userAddressParam);

  return newUserCreatedEvent;
}

function addMockedFunction(userAddress: Address, contractAddress: Address): void {

  let ipfsDoc = ethereum.Value.fromTuple(
    changetype<ethereum.Tuple>([
      ethereum.Value.fromBytes(changetype<Bytes>(Bytes.fromHexString(getHashContainer()[0]))), 
      ethereum.Value.fromBytes(changetype<Bytes>(Bytes.fromHexString(getHashContainer()[0])))
    ])
  );
  let rating = ethereum.Value.fromI32(10);
  let payOutRating = ethereum.Value.fromI32(10);
  let creationTime = ethereum.Value.fromSignedBigInt(BigInt.fromString('1234'));
  let roles = ethereum.Value.fromBytesArray([]);
  let followedCommunities = ethereum.Value.fromUnsignedBigIntArray([]);
  let rewardPeriods = ethereum.Value.fromI32Array([]);

  let args = changetype<ethereum.Tuple>([ipfsDoc, rating, payOutRating, creationTime, roles, followedCommunities, rewardPeriods]);
  createMockedFunction(contractAddress, "getUserByAddress", "getUserByAddress(address):(((bytes32,bytes32),int32,int32,uint256,bytes32[],uint32[],uint16[]))")
    .withArgs([ethereum.Value.fromAddress(userAddress)])
    .returns([ethereum.Value.fromTuple(args)])
}