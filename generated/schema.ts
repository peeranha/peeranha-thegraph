// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class User extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save User entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save User entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("User", id.toString(), this);
  }

  static load(id: string): User | null {
    return store.get("User", id) as User | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get rating(): i32 {
    let value = this.get("rating");
    return value.toI32();
  }

  set rating(value: i32) {
    this.set("rating", Value.fromI32(value));
  }

  get displayName(): string | null {
    let value = this.get("displayName");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set displayName(value: string | null) {
    if (value === null) {
      this.unset("displayName");
    } else {
      this.set("displayName", Value.fromString(value as string));
    }
  }

  get company(): string | null {
    let value = this.get("company");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set company(value: string | null) {
    if (value === null) {
      this.unset("company");
    } else {
      this.set("company", Value.fromString(value as string));
    }
  }

  get position(): string | null {
    let value = this.get("position");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set position(value: string | null) {
    if (value === null) {
      this.unset("position");
    } else {
      this.set("position", Value.fromString(value as string));
    }
  }

  get location(): string | null {
    let value = this.get("location");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set location(value: string | null) {
    if (value === null) {
      this.unset("location");
    } else {
      this.set("location", Value.fromString(value as string));
    }
  }

  get about(): string | null {
    let value = this.get("about");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set about(value: string | null) {
    if (value === null) {
      this.unset("about");
    } else {
      this.set("about", Value.fromString(value as string));
    }
  }

  get avatar(): string | null {
    let value = this.get("avatar");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set avatar(value: string | null) {
    if (value === null) {
      this.unset("avatar");
    } else {
      this.set("avatar", Value.fromString(value as string));
    }
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes {
    let value = this.get("ipfsHash2");
    return value.toBytes();
  }

  set ipfsHash2(value: Bytes) {
    this.set("ipfsHash2", Value.fromBytes(value));
  }
}

export class Community extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Community entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Community entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Community", id.toString(), this);
  }

  static load(id: string): Community | null {
    return store.get("Community", id) as Community | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get title(): string {
    let value = this.get("title");
    return value.toString();
  }

  set title(value: string) {
    this.set("title", Value.fromString(value));
  }

  get description(): string | null {
    let value = this.get("description");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set description(value: string | null) {
    if (value === null) {
      this.unset("description");
    } else {
      this.set("description", Value.fromString(value as string));
    }
  }

  get website(): string | null {
    let value = this.get("website");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set website(value: string | null) {
    if (value === null) {
      this.unset("website");
    } else {
      this.set("website", Value.fromString(value as string));
    }
  }

  get language(): string | null {
    let value = this.get("language");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set language(value: string | null) {
    if (value === null) {
      this.unset("language");
    } else {
      this.set("language", Value.fromString(value as string));
    }
  }

  get isFrozen(): boolean {
    let value = this.get("isFrozen");
    return value.toBoolean();
  }

  set isFrozen(value: boolean) {
    this.set("isFrozen", Value.fromBoolean(value));
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes {
    let value = this.get("ipfsHash2");
    return value.toBytes();
  }

  set ipfsHash2(value: Bytes) {
    this.set("ipfsHash2", Value.fromBytes(value));
  }
}

export class Tag extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Tag entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Tag entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Tag", id.toString(), this);
  }

  static load(id: string): Tag | null {
    return store.get("Tag", id) as Tag | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get communityId(): BigInt {
    let value = this.get("communityId");
    return value.toBigInt();
  }

  set communityId(value: BigInt) {
    this.set("communityId", Value.fromBigInt(value));
  }

  get title(): string {
    let value = this.get("title");
    return value.toString();
  }

  set title(value: string) {
    this.set("title", Value.fromString(value));
  }

  get description(): string | null {
    let value = this.get("description");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set description(value: string | null) {
    if (value === null) {
      this.unset("description");
    } else {
      this.set("description", Value.fromString(value as string));
    }
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes {
    let value = this.get("ipfsHash2");
    return value.toBytes();
  }

  set ipfsHash2(value: Bytes) {
    this.set("ipfsHash2", Value.fromBytes(value));
  }
}

export class Post extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Post entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Post entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Post", id.toString(), this);
  }

  static load(id: string): Post | null {
    return store.get("Post", id) as Post | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get tags(): Array<i32> {
    let value = this.get("tags");
    return value.toI32Array();
  }

  set tags(value: Array<i32>) {
    this.set("tags", Value.fromI32Array(value));
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes | null {
    let value = this.get("ipfsHash2");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytes();
    }
  }

  set ipfsHash2(value: Bytes | null) {
    if (value === null) {
      this.unset("ipfsHash2");
    } else {
      this.set("ipfsHash2", Value.fromBytes(value as Bytes));
    }
  }

  get typePost(): string {
    let value = this.get("typePost");
    return value.toString();
  }

  set typePost(value: string) {
    this.set("typePost", Value.fromString(value));
  }

  get author(): Bytes {
    let value = this.get("author");
    return value.toBytes();
  }

  set author(value: Bytes) {
    this.set("author", Value.fromBytes(value));
  }

  get rating(): i32 {
    let value = this.get("rating");
    return value.toI32();
  }

  set rating(value: i32) {
    this.set("rating", Value.fromI32(value));
  }

  get postTime(): i32 {
    let value = this.get("postTime");
    return value.toI32();
  }

  set postTime(value: i32) {
    this.set("postTime", Value.fromI32(value));
  }

  get communityId(): i32 {
    let value = this.get("communityId");
    return value.toI32();
  }

  set communityId(value: i32) {
    this.set("communityId", Value.fromI32(value));
  }

  get title(): string {
    let value = this.get("title");
    return value.toString();
  }

  set title(value: string) {
    this.set("title", Value.fromString(value));
  }

  get content(): string {
    let value = this.get("content");
    return value.toString();
  }

  set content(value: string) {
    this.set("content", Value.fromString(value));
  }

  get propertyCount(): i32 {
    let value = this.get("propertyCount");
    return value.toI32();
  }

  set propertyCount(value: i32) {
    this.set("propertyCount", Value.fromI32(value));
  }

  get commentCount(): i32 {
    let value = this.get("commentCount");
    return value.toI32();
  }

  set commentCount(value: i32) {
    this.set("commentCount", Value.fromI32(value));
  }

  get replyCount(): i32 {
    let value = this.get("replyCount");
    return value.toI32();
  }

  set replyCount(value: i32) {
    this.set("replyCount", Value.fromI32(value));
  }

  get isDeleted(): boolean {
    let value = this.get("isDeleted");
    return value.toBoolean();
  }

  set isDeleted(value: boolean) {
    this.set("isDeleted", Value.fromBoolean(value));
  }

  get properties(): Array<Bytes> | null {
    let value = this.get("properties");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytesArray();
    }
  }

  set properties(value: Array<Bytes> | null) {
    if (value === null) {
      this.unset("properties");
    } else {
      this.set("properties", Value.fromBytesArray(value as Array<Bytes>));
    }
  }
}

export class Reply extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Reply entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Reply entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Reply", id.toString(), this);
  }

  static load(id: string): Reply | null {
    return store.get("Reply", id) as Reply | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes | null {
    let value = this.get("ipfsHash2");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytes();
    }
  }

  set ipfsHash2(value: Bytes | null) {
    if (value === null) {
      this.unset("ipfsHash2");
    } else {
      this.set("ipfsHash2", Value.fromBytes(value as Bytes));
    }
  }

  get author(): Bytes {
    let value = this.get("author");
    return value.toBytes();
  }

  set author(value: Bytes) {
    this.set("author", Value.fromBytes(value));
  }

  get rating(): i32 {
    let value = this.get("rating");
    return value.toI32();
  }

  set rating(value: i32) {
    this.set("rating", Value.fromI32(value));
  }

  get postTime(): i32 {
    let value = this.get("postTime");
    return value.toI32();
  }

  set postTime(value: i32) {
    this.set("postTime", Value.fromI32(value));
  }

  get content(): string {
    let value = this.get("content");
    return value.toString();
  }

  set content(value: string) {
    this.set("content", Value.fromString(value));
  }

  get path(): string {
    let value = this.get("path");
    return value.toString();
  }

  set path(value: string) {
    this.set("path", Value.fromString(value));
  }

  get propertyCount(): i32 {
    let value = this.get("propertyCount");
    return value.toI32();
  }

  set propertyCount(value: i32) {
    this.set("propertyCount", Value.fromI32(value));
  }

  get commentCount(): i32 {
    let value = this.get("commentCount");
    return value.toI32();
  }

  set commentCount(value: i32) {
    this.set("commentCount", Value.fromI32(value));
  }

  get replyCount(): i32 {
    let value = this.get("replyCount");
    return value.toI32();
  }

  set replyCount(value: i32) {
    this.set("replyCount", Value.fromI32(value));
  }

  get isDeleted(): boolean {
    let value = this.get("isDeleted");
    return value.toBoolean();
  }

  set isDeleted(value: boolean) {
    this.set("isDeleted", Value.fromBoolean(value));
  }

  get properties(): Array<Bytes> | null {
    let value = this.get("properties");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytesArray();
    }
  }

  set properties(value: Array<Bytes> | null) {
    if (value === null) {
      this.unset("properties");
    } else {
      this.set("properties", Value.fromBytesArray(value as Array<Bytes>));
    }
  }
}

export class Comment extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Comment entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Comment entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Comment", id.toString(), this);
  }

  static load(id: string): Comment | null {
    return store.get("Comment", id) as Comment | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get ipfsHash(): Bytes {
    let value = this.get("ipfsHash");
    return value.toBytes();
  }

  set ipfsHash(value: Bytes) {
    this.set("ipfsHash", Value.fromBytes(value));
  }

  get ipfsHash2(): Bytes | null {
    let value = this.get("ipfsHash2");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytes();
    }
  }

  set ipfsHash2(value: Bytes | null) {
    if (value === null) {
      this.unset("ipfsHash2");
    } else {
      this.set("ipfsHash2", Value.fromBytes(value as Bytes));
    }
  }

  get author(): Bytes {
    let value = this.get("author");
    return value.toBytes();
  }

  set author(value: Bytes) {
    this.set("author", Value.fromBytes(value));
  }

  get rating(): i32 {
    let value = this.get("rating");
    return value.toI32();
  }

  set rating(value: i32) {
    this.set("rating", Value.fromI32(value));
  }

  get postTime(): i32 {
    let value = this.get("postTime");
    return value.toI32();
  }

  set postTime(value: i32) {
    this.set("postTime", Value.fromI32(value));
  }

  get content(): string {
    let value = this.get("content");
    return value.toString();
  }

  set content(value: string) {
    this.set("content", Value.fromString(value));
  }

  get path(): string {
    let value = this.get("path");
    return value.toString();
  }

  set path(value: string) {
    this.set("path", Value.fromString(value));
  }

  get propertyCount(): i32 {
    let value = this.get("propertyCount");
    return value.toI32();
  }

  set propertyCount(value: i32) {
    this.set("propertyCount", Value.fromI32(value));
  }

  get isDeleted(): boolean {
    let value = this.get("isDeleted");
    return value.toBoolean();
  }

  set isDeleted(value: boolean) {
    this.set("isDeleted", Value.fromBoolean(value));
  }

  get properties(): Array<Bytes> | null {
    let value = this.get("properties");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toBytesArray();
    }
  }

  set properties(value: Array<Bytes> | null) {
    if (value === null) {
      this.unset("properties");
    } else {
      this.set("properties", Value.fromBytesArray(value as Array<Bytes>));
    }
  }
}
