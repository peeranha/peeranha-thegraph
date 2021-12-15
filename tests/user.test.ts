import { test, assert, clearStore, logStore } from "matchstick-as/assembly/index"
import { handleNewUser } from "../src/mapping"
import { newUser } from "../src/user"
import { Address } from "@graphprotocol/graph-ts"
import { User } from "../generated/schema"

test("Initial User test", () => {
    let user = new User("newID");
    user.save();

    assert.fieldEquals("User", "newID", "id", "newID");

    clearStore();
})

function getHashContainer(): string[] {
    return [
      "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
      "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    ];
}