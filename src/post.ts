import { json, Bytes, ipfs, BigInt, Address, ByteArray, log, store, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Tag, CommunityDocumentation } from '../generated/schema'
import { getPeeranhaContent, ERROR_IPFS, isValidIPFS } from './utils'
import { updateUserRating, updateStartUserRating, getUser, newUser } from './user'
import { getCommunity } from './community-tag'

export function newPost(post: Post | null, postId: BigInt, blockTimestamp: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  post.communityId = peeranhaPost.communityId;
  post.author = peeranhaPost.author.toHex();
  post.rating = peeranhaPost.rating;
  post.postTime = peeranhaPost.postTime
  post.commentCount = peeranhaPost.commentCount;
  post.replyCount = peeranhaPost.replyCount;
  post.officialReply = peeranhaPost.officialReply;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = false;
  post.replies = [];
  post.comments = [];
  post.postContent = '';

  let community = getCommunity(post.communityId);
  community.postCount++;
  community.save();

  let user = getUser(peeranhaPost.author);
  if (user == null) {
    newUser(user, peeranhaPost.author, blockTimestamp);
  }
  user.postCount++;
  user.save();

  addDataToPost(post, postId);
  updateStartUserRating(Address.fromString(post.author), post.communityId);
}

export function addDataToPost(post: Post | null, postId: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  let postTagsBuf = peeranhaPost.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();

    if(!post.tags.includes(newTag)) {
      let tag = Tag.load(peeranhaPost.communityId.toString() + '-' + newTag.toString());
      if (tag != null) {
        post.postContent += ' ' + tag.name;
        tag.postCount++;
        tag.save();
      }
    }
  }

  if(peeranhaPost.tags.length != 0) {
    let postTagsBuf = post.tags;
    for (let i = 0; i < post.tags.length; i++) {
      let oldTag = postTagsBuf.pop();

      if(!peeranhaPost.tags.includes(oldTag)) {
        let tag = Tag.load(peeranhaPost.communityId.toString() + '-' + oldTag.toString());
        if (tag != null) {
          tag.postCount--;
          tag.save();
        }
      }
   }
  }
  
  post.tags = peeranhaPost.tags;
  post.ipfsHash = peeranhaPost.ipfsDoc.hash;
  post.ipfsHash2 = peeranhaPost.ipfsDoc.hash2;
  post.postType = peeranhaPost.postType;

  getIpfsPostData(post);
}

function getIpfsPostData(post: Post | null): void {
  let hashstr = post.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
      let title = ipfsObj.get('title');
      if (!title.isNull()) {
        post.title = title.toString();
        post.postContent += ' ' + title.toString();
      }
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        post.content = content.toString();
        post.postContent += ' ' + content.toString();
      }
    } else {
      post.title = ERROR_IPFS;
      post.content = ERROR_IPFS;
    }
  }
}

export function deletePost(post: Post | null, postId: BigInt): void {
  post.isDeleted = true;

  updateUserRating(Address.fromString(post.author), post.communityId);

  let community = getCommunity(post.communityId);

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(postId.toString() + '-' + i.toString());
    if (reply != null && !reply.isDeleted) {
      updateUserRating(Address.fromString(reply.author), post.communityId);
      
      let userReply = getUser(Address.fromString(reply.author));
      userReply.replyCount--;
      userReply.save();
      
      community.replyCount--;
    }
  }
  community.deletedPostCount++;
  community.postCount--;
  community.save();

  let userPost = getUser(Address.fromString(post.author));
  userPost.postCount--;
  userPost.save();
}

export function updatePostUsersRatings(post: Post | null): void {
  updateUserRating(Address.fromString(post.author), post.communityId);

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(post.id + "-" + i.toString());
    if (
    (reply != null && !reply.isDeleted) && 
    (reply.isFirstReply || reply.isQuickReply || reply.rating != 0 || reply.isBestReply)) {

      updateUserRating(Address.fromString(reply.author), post.communityId);

    }
  }
}

export function newReply(reply: Reply | null, postId: BigInt, replyId: BigInt, blockTimestamp: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId.toI32());
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaReply == null || reply == null) return;

  reply.author = peeranhaReply.author.toHex();
  reply.postTime = peeranhaReply.postTime;
  reply.rating = peeranhaReply.rating;
  reply.postId = postId;
  reply.parentReplyId = peeranhaReply.parentReplyId;
  reply.commentCount = peeranhaReply.commentCount;
  reply.isFirstReply = peeranhaReply.isFirstReply;
  reply.isQuickReply = peeranhaReply.isQuickReply;
  reply.isOfficialReply = peeranhaPost.officialReply == replyId.toI32();
  reply.isDeleted = false;
  reply.comments = [];
  reply.isBestReply = false;

  let post = Post.load(postId.toString())
  if (peeranhaReply.parentReplyId == 0) {
    if (post != null) {
      post.replyCount++;

      let replies = post.replies;

      replies.push(postId.toString() + '-' + replyId.toString())
      post.replies = replies;
      if (peeranhaPost.officialReply == replyId.toI32()) {
        post.officialReply = replyId.toI32();
      }

      let community = getCommunity(post.communityId);
      community.replyCount++;
      community.save();
    }
  }

  let user = getUser(Address.fromString(reply.author));
  if (user == null) {
    newUser(user, Address.fromString(reply.author), blockTimestamp);
  }
  user.replyCount++;
  user.save();

  if (peeranhaReply.isFirstReply || peeranhaReply.isQuickReply) {
    updateUserRating(peeranhaReply.author, post.communityId);
  }
  addDataToReply(reply, postId, replyId);
  updateStartUserRating(Address.fromString(reply.author), post.communityId);
  post.postContent += ' ' + reply.content;
  post.save();
}

export function addDataToReply(reply: Reply | null, postId: BigInt, replyId: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId.toI32());
  if (peeranhaReply == null) return;

  reply.ipfsHash = peeranhaReply.ipfsDoc.hash;
  reply.ipfsHash2 = peeranhaReply.ipfsDoc.hash2;
  
  getIpfsReplyData(reply);
}

function getIpfsReplyData(reply: Reply | null): void {
  let hashstr = reply.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        reply.content = content.toString();
      }
    } else {
      reply.content = ERROR_IPFS;
    }
  }
}

export function deleteReply(reply: Reply | null, postId: BigInt): void {
  if (reply == null) return;
  reply.isDeleted = true;
  let post = Post.load(postId.toString());
  if (post == null) return;

  updateUserRating(Address.fromString(reply.author), post.communityId);

  if (reply.parentReplyId == 0) {
    let post = Post.load(postId.toString())
    if (post != null) {
      let community = getCommunity(post.communityId);
      community.replyCount--;
      community.save();
    }
  }

  if (reply.isBestReply) {
    post.bestReply = 0;
    post.save();
  }

  let user = getUser(Address.fromString(reply.author));
  user.replyCount--;
  user.save();
}

export function newComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.author = peeranhaComment.author.toHex();
  comment.postTime = peeranhaComment.postTime;
  comment.postId = postId;
  comment.rating = peeranhaComment.rating;
  comment.parentReplyId = parentReplyId.toI32();  
  comment.isDeleted = false;
  let post = Post.load(postId.toString());
  let commentFullId = postId.toString() + '-' + parentReplyId.toString() +  '-' + commentId.toString();
  if (parentReplyId == BigInt.fromI32(0)) {
    
    if (post != null ) {    // init post
      post.commentCount++;
      let comments = post.comments
      comments.push(commentFullId)
      post.comments = comments

      
    }
  } else {
    let reply = Reply.load(postId.toString() + '-' + parentReplyId.toString());
    if (reply != null ) {     // init post
      reply.commentCount++;
      let comments = reply.comments
      comments.push(commentFullId)
      reply.comments = comments

      reply.save();
    }
  }

  addDataToComment(comment, postId, parentReplyId, commentId);
  updateStartUserRating(Address.fromString(post.author), post.communityId);

  post.postContent += ' ' + comment.content;
  post.save();
}

export function addDataToComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.ipfsHash = peeranhaComment.ipfsDoc.hash;
  comment.ipfsHash2 = peeranhaComment.ipfsDoc.hash2;
  
  getIpfsCommentData(comment);
}

function getIpfsCommentData(comment: Comment | null): void {
  let hashstr = comment.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        comment.content = content.toString();
      }
    } else {
      comment.content = ERROR_IPFS;
    }
  }
}

export function deleteComment(comment: Comment | null, postId: BigInt): void {
  comment.isDeleted = true;
  const post = Post.load(postId.toString());
  if (comment.author !== post.author) {
    updateUserRating(Address.fromString(comment.author), post.communityId);
  }
}

export function updatePostContent(postId: BigInt): void {
  let post = Post.load(postId.toString());
  post.postContent = '';
  
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;
  let postTagsBuf = post.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let tagId = postTagsBuf.pop();
    let tag = Tag.load(post.communityId.toString() + '-' + tagId.toString());
    if (tag != null) {
      post.postContent += ' ' + tag.name;
    }
  }
  post.postContent += ' ' + post.title;
  post.postContent += ' ' + post.content;
  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(postId.toString() + '-' + replyId.toString());
    if (reply != null && !reply.isDeleted) {
      post.postContent += ' ' + reply.content;
    
      for (let commentId = 1; commentId <= reply.commentCount; commentId++) {
        let comment = Comment.load(postId.toString() + '-' + replyId.toString() + '-' +  commentId.toString());
        if (comment != null && !comment.isDeleted) {
          post.postContent += ' ' + comment.content;
        }
      }
    }
  }
  for (let commentId = 1; commentId <= post.commentCount; commentId++) {
    let comment = Comment.load(postId.toString() + '-' + '0' + '-' +  commentId.toString());
    if (comment != null && !comment.isDeleted) {
      post.postContent += ' ' + comment.content;
    }
  }
  post.save();
}

const convertIpfsHash = (ipfsHash: Bytes | null): Bytes => { //to utils
  let hashstr = ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  return result;
};

function getChildrenPostsByDocumentation(posts: string[], children: JSONValue[]): string[] {
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const id = children[i].toObject().get("id");
    if (!id.isNull() && id.kind !== JSONValueKind.NUMBER) {
      let sgetChildrenPostsByDocumentation = "";
      for (let index = 0; index < posts.length; index++) {
        sgetChildrenPostsByDocumentation += "newPost - ";
        sgetChildrenPostsByDocumentation += posts[index];
        sgetChildrenPostsByDocumentation += "; ";
      }
      log.error("sgetChildrenPostsByDocumentation:{}", [sgetChildrenPostsByDocumentation]);
      posts.push(id.toString())
      if (!children[i].toObject().get("children").isNull()) {
        if (children[i].toObject().get("children").toArray().length > 0)
          posts = getChildrenPostsByDocumentation(posts, children[i].toObject().get("children").toArray());
      }
    }
  }
  return posts;
}

const getPostByDocumentation = (result: Bytes): string[] => {
  let posts: string[] = [];
  posts.splice(0,posts.length);
  // log.info("result:{}", [result.toString()]);
  let aagetChildrenPostsByDocumentation = "";
  for (let index = 0; index < posts.length; index++) {
    aagetChildrenPostsByDocumentation += "newPost - ";
    aagetChildrenPostsByDocumentation += posts[index];
    aagetChildrenPostsByDocumentation += "; ";
  }
  log.error("aagetChildrenPostsByDocumentation:{}", [aagetChildrenPostsByDocumentation]);
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()

      const pinnedPost = ipfsObj.get('pinnedPost');
      if (!pinnedPost.isNull()){
        const pinnedId = pinnedPost.toObject().get('id');
        if(!pinnedId.isNull() && pinnedId.kind !== JSONValueKind.NUMBER){
          if(pinnedId.toString() !== ""){
            posts.push(pinnedId.toString())

            // log.info("pinnedId:{}", [pinnedId.toString()]);
          }
        }
      }
      const documentations = ipfsObj.get('documentations');
      if (!documentations.isNull()) {
        const documentationsArray = documentations.toArray();

        for (let i = 0; i < documentationsArray.length; i++) {
          const documentationObject = documentationsArray[i];
          const id = documentationObject.toObject().get('id');

          if (!id.isNull() && id.kind !== JSONValueKind.NUMBER) {
            posts.push(id.toString())        
            let children = documentationObject.toObject().get('children');
            // let aagetChildrenPostsByDocumentation = "";
            // for (let index = 0; index < posts.length; index++) {
            //   aagetChildrenPostsByDocumentation += "newPost - ";
            //   aagetChildrenPostsByDocumentation += posts[index];
            //   aagetChildrenPostsByDocumentation += "; ";
            // }
            // log.error("aagetChildrenPostsByDocumentation:{}", [aagetChildrenPostsByDocumentation]);
            if (!children.isNull()) {
              if (children.toArray().length > 0) {
                posts = getChildrenPostsByDocumentation(posts, children.toArray());
              }
            }
          }
        }
      }
    }
  }
  return posts;
}

// let oldPosts: string[] = [];
// let newPosts: string[] = [];
let posts2: string[] = [];
let uniqueChars: string[] = [];
let uniqueChars2: string[] = [];

export function generateDocumentationPosts(
  comunityId: BigInt,
  userAddr: Address,
  blockTimestamp: BigInt,
  oldDocumentationIpfsHash: Bytes | null, 
  newDocumentationIpfsHash: Bytes
): void {
  // log.info("documentation2:{}", [newDocumentationIpfsHash.toString()]);
  // log.info("oldDocumentationIpfsHash2:{}", [oldDocumentationIpfsHash.toString()]);
  if (newDocumentationIpfsHash === null)
    return;

  // let oldPosts: string[] = [];

  // if (oldDocumentationIpfsHash !== null) {
  //   const oldResult = convertIpfsHash(oldDocumentationIpfsHash);
  //   oldPosts = getPostByDocumentation(oldResult);
  // }
  let newPosts: string[] = []
  let oldPosts: string[] = []
  if (oldDocumentationIpfsHash !== null) {
    // const oldResult = convertIpfsHash(oldDocumentationIpfsHash);
    const oldDocumentation = indexingDocumentation(comunityId, oldDocumentationIpfsHash);
    for (let index = 0; index < posts2.length; index++) {
      oldPosts.push(posts2[index]);
    }
  }
  const newDoc = indexingDocumentation(comunityId, newDocumentationIpfsHash);
  if(newDoc){
    newDoc.save();
  }
  uniqueChars.splice(0,uniqueChars.length);;
  oldPosts.forEach((element) => {
      if (!uniqueChars.includes(element)) {
          uniqueChars.push(element);
      }
  });
  oldPosts = uniqueChars;
  for (let index = 0; index < posts2.length; index++) {
    newPosts.push(posts2[index]);
  }
  uniqueChars2.splice(0,uniqueChars2.length);;
  newPosts.forEach((element) => {
      if (!uniqueChars2.includes(element)) {
          uniqueChars2.push(element);
      }
  });
  newPosts = uniqueChars2;
  let createdPosts: string[] = []
  let deletePosts: string[] = []
  for (let index = 0; index < newPosts.length; index++) {
    if (oldPosts.indexOf(newPosts[index]) !== -1){
      createdPosts.push(newPosts[index]);
    }
  }
  for (let index = 0; index < oldPosts.length; index++) {
    if (newPosts.indexOf(oldPosts[index]) === -1){
      deletePosts.push(oldPosts[index]);
    }
  }
  // for (let index = 0; index < newPosts.length; index++) {
  //   newPostsStr += "newPost - ";
  //   newPostsStr += newPosts[index];
  //   newPostsStr += "; ";
  // }
  // for (let index = 0; index < oldPosts.length; index++) {
  //   oldPostsStr += "oldPost - ";
  //   oldPostsStr += oldPosts[index];
  //   oldPostsStr += "; ";
  // }
  // log.info("empty1:{}", [""])
  // log.info("newPostsStr:{}", [newPostsStr])
  // log.info("empty2:{}", [""])
  // log.info("oldPostsStr:{}", [oldPostsStr])
  // log.info("empty3:{}", [""])
  // const deletePosts = massiveSubtraction(oldPosts, newPosts);
  // const createPosts = massiveSubtraction(newPosts, oldPosts);
  // let createdPosts: string[] = []
  // let deletePosts: string[] = []
  // for (let index = 0; index < newPosts.length; index++) {
  //   if (oldPosts.indexOf(newPosts[index]) !== -1){
  //     createdPosts.push(newPosts[index]);
  //   }
  // }
  // for (let index = 0; index < oldPosts.length; index++) {
  //   if (newPosts.indexOf(oldPosts[index]) === -1){
  //     deletePosts.push(oldPosts[index]);
  //   }
  // }
  // createPosts = newPosts.filter(x=>oldPosts.indexOf(x)===-1);
  // deletePosts = oldPosts.filter(x=>newPosts.indexOf(x)==-1);
  // let createPostsStr = "";
  // let deletePostsStr = "";
  // for (let index = 0; index < newPosts.length; index++) {
  //   createPostsStr += "newPosts - ";
  //   createPostsStr += newPosts[index];
  //   createPostsStr += "; ";
  // }
  // for (let index = 0; index < oldPosts.length; index++) {
  //   deletePostsStr += "oldPosts - ";
  //   deletePostsStr += oldPosts[index];
  //   deletePostsStr += "; ";
  // }
  // let a: string[] = ["1","2","3","4"]
  // let b: string[] = ["3","4","5","6"]
  // let strA = massiveSubtraction(a, b);
  // let strB = massiveSubtraction(b, a);

  // let strA: string[] = [];
  // let strB: string[] = [];
  // let strAStr = ""
  // let strBStr = ""
  // for (let index = 0; index < a.length; index++) {
  //   if (b.indexOf(a[index]) === -1){
  //     strA.push(a[index]);
  //   }
  // }
  // for (let index = 0; index < b.length; index++) {
  //   if (a.indexOf(b[index]) === -1){
  //     strB.push(b[index]);
  //   }
  // }

  // let strAStr = ""
  // let strBStr = ""
  // for (let index = 0; index < strA.length; index++) {
  //   strAStr += "strAStr - ";
  //   strAStr += strA[index];
  //   strAStr += "; ";
  // }
  // for (let index = 0; index < strB.length; index++) {
  //   strBStr += "strBStr - ";
  //   strBStr += strB[index];
  //   strBStr += "; ";
  // }
  // log.warning("strAStr:{}", [strAStr])
  // log.warning("strBStr:{}", [strBStr])
  // log.info("empty111:{}", [""])
  // log.info("newPostsStr:{}", [createPostsStr])
  // log.info("empty222:{}", [""])
  // log.info("oldPostsStr:{}", [deletePostsStr])
  // log.info("empty333:{}", [""])
  // for (let index = 0; index < createPosts.length; index++) {
  //   log.info("createPosts:{}", [createPosts[index]])
  // }
  // const deletePosts = oldPosts.filter(x=>newPosts.indexOf(x)===-1);
  // for (let index = 0; index < deletePosts.length; index++) {
  //   log.warning("deletePosts:{}", [deletePosts[index]])
  // }
  for (let index = 0; index < newPosts.length; index++) {
    log.warning("321", []);
    // createPost(comunityId, userAddr, blockTimestamp, createPosts[index])
    if(newPosts[index] != "" && createdPosts.indexOf(newPosts[index]) === -1){ 
      let post = new Post(newPosts[index]);
      post.author = userAddr.toHex();
      post.communityId = comunityId;
      post.ipfsHash = ByteArray.fromHexString(newPosts[index]) as Bytes;
      let community = getCommunity(post.communityId);
      community.postCount++;
      community.save();
  
      let user = getUser(userAddr);
      if (user == null) {
        newUser(user, userAddr, blockTimestamp);
      }
      user.postCount++;
      user.save();
  
      getIpfsPostData(post);
      updateStartUserRating(Address.fromString(post.author), post.communityId);
      post.save();
    }
  }
  for (let index = 0; index < deletePosts.length; index++) {
    log.warning("123", []);
    let community = getCommunity(comunityId);
    community.postCount--;
    community.save();

    let user = getUser(userAddr);
    if (user !== null) {
      user.postCount--;
      user.save();
    }
    updateStartUserRating(Address.fromString(userAddr.toHex()), comunityId);
    store.remove("Post", deletePosts[index]);
  }
}

const createPost = (
  comunityId: BigInt, 
  userAddr: Address, 
  blockTimestamp: BigInt, 
  ipfsHash: string
): void => {
  if(ipfsHash != ""){ 
    let post = new Post(ipfsHash);
    post.author = userAddr.toHex();
    post.communityId = comunityId;
    post.ipfsHash = ByteArray.fromHexString(ipfsHash) as Bytes;
    let community = getCommunity(post.communityId);
    community.postCount++;
    community.save();

    let user = getUser(userAddr);
    if (user == null) {
      newUser(user, userAddr, blockTimestamp);
    }
    user.postCount++;
    user.save();

    getIpfsPostData(post);
    updateStartUserRating(Address.fromString(post.author), post.communityId);
    post.save();
  }
}

export function indexingDocumentation(
  comunityId: BigInt,
  ipfsHash: Bytes | null,
): CommunityDocumentation | null {
  posts2.splice(0,posts2.length);
  const documentation = CommunityDocumentation.load(comunityId.toString());
  documentation.ipfsHash = ipfsHash;
  if (documentation == null || documentation.ipfsHash == null)
    return null;
  let result = convertIpfsHash(documentation.ipfsHash)

  documentation.documentationJSON = '{'

  if (result != null) {
    let ipfsData = json.fromBytes(result);
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()

      documentation.documentationJSON += '"pinnedPost":{"id": "'
      const pinnedPost = ipfsObj.get('pinnedPost');
      if (!pinnedPost.isNull()){
        const pinnedId = pinnedPost.toObject().get('id');
        const pinnedTitle = pinnedPost.toObject().get('title');
        if(!pinnedId.isNull() && !pinnedTitle.isNull()){
          if(pinnedId.toString() !== ""){
            documentation.documentationJSON += pinnedId.toString() + '", "title": "' + pinnedTitle.toString();
            posts2.push(pinnedId.toString());
          }
        } else {
          documentation.documentationJSON += '", "title": "';
        }
      }
      // if (!pinnedId.isNull() && pinnedId.kind !== JSONValueKind.NUMBER && !pinnedTitle.isNull()) {
      //   createPost(createPosts, comunityId, userAddr, blockTimestamp, pinnedId);
      //   documentation.documentationJSON += pinnedId.toString() + '", "title": "' + pinnedTitle.toString();
      // } else {
      //   documentation.documentationJSON += '", "title": "';
      // }
      documentation.documentationJSON += '"},';
      const documentations = ipfsObj.get('documentations');

      documentation.documentationJSON += '"documentations":['
      if (!documentations.isNull()) {
        const documentationsArray = documentations.toArray();

        for (let i = 0; i < documentationsArray.length; i++) {
          const documentationObject = documentationsArray[i];
          const id = documentationObject.toObject().get('id');
          const title = documentationObject.toObject().get('title');
          if (!id.isNull() && id.kind !== JSONValueKind.NUMBER && !title.isNull()) {
            documentation.documentationJSON += '{"id": "' + id.toString() + '",' + ' "title": "' + title.toString() + '", "children": [';
            let children = documentationObject.toObject().get('children');
            posts2.push(id.toString())
            if (!children.isNull()) {
              if (children.toArray().length > 0) {
                documentation = indexingJson(documentation, children.toArray());
              }
            }
            documentation.documentationJSON += ']}';
          } else {
            documentation.documentationJSON += '{"id": "", "title": "", "children": []}';
          }
          if (i < documentationsArray.length - 1)
            documentation.documentationJSON += ', ';
        }
      } else {
        documentation.documentationJSON += '{"id": "", "title": "", "children": []}';
      }
      documentation.documentationJSON += ']';
    }
  }
  // log.info("result:{}", [result.toString()]);
  documentation.documentationJSON += '}';
  return documentation;
}

function indexingJson(
  documentation: CommunityDocumentation | null, 
  children: JSONValue[]
): CommunityDocumentation | null {
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const id = children[i].toObject().get("id");
    const title = children[i].toObject().get("title");
    if (!id.isNull() && id.kind !== JSONValueKind.NUMBER && !title.isNull()) {
      log.warning("123123:{}",[""])
      // let listCreatePostsStr = "";
      // for (let index = 0; index < createPosts.length; index++) {
      //   listCreatePostsStr += "newPost - ";
      //   listCreatePostsStr += createPosts[index];
      //   listCreatePostsStr += "; ";
      // }
      // log.error("createPostslistCreatePostsStr:{}",[listCreatePostsStr])
      documentation.documentationJSON += '{"id": "' + id.toString() + '",' + ' "title": "' + title.toString() + '", "children": ['
      posts2.push(id.toString());
      let aagetChildrenPostsByDocumentation = "";
      for (let index = 0; index < posts2.length; index++) {
        aagetChildrenPostsByDocumentation += "indexingJson - ";
        aagetChildrenPostsByDocumentation += posts2[index];
        aagetChildrenPostsByDocumentation += "; ";
      }
      log.error("indexingJson:{}", [aagetChildrenPostsByDocumentation]);
      if (!children[i].toObject().get("children").isNull()) {
        if (children[i].toObject().get("children").toArray().length > 0)
          documentation = indexingJson(documentation, children[i].toObject().get("children").toArray());
      }
      documentation.documentationJSON += ']}';

      if (i < childrenLength - 1)
        documentation.documentationJSON += ', ';
    }
  }

  return documentation;
}