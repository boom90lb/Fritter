import {HydratedDocument, Types} from 'mongoose';
import type {Freet} from './model';
import FreetModel from './model';
import UserCollection from '../user/collection';
import { userRouter } from '../user/router';
import UserModel, { User } from '../user/model';
import _ from 'lodash';

const oneDay = 8.64e+7;
const oneWeek = 6.048e+8;
/**
 * This files contains a class that has the functionality to explore freets
 * stored in MongoDB, including adding, finding, updating, and deleting freets.
 * Feel free to add additional operations in this file.
 *
 * Note: HydratedDocument<Freet> is the output of the FreetModel() constructor,
 * and contains all the information in Freet. https://mongoosejs.com/docs/typescript.html
 */
class FreetCollection {
  /**
   * Add a freet to the collection
   *
   * @param {string} authorId - The id of the author of the freet
   * @param {string} content - The id of the content of the freet
   * @return {Promise<HydratedDocument<Freet>>} - The newly created freet
   */
  static async addOne(authorId: Types.ObjectId | string, content: string): Promise<HydratedDocument<Freet>> {
    const date = new Date();
    const freet = new FreetModel({
      authorId,
      dateCreated: date,
      content,
      dateModified: date,
      votes: [0, 0],
      reports: new Map([['spam', 0],
                        ['misinformation', 0],
                        ['offensive', 0]
      ]),
      flag: false,
      status: "good",
      audit: "none",
      auditInfo: new Map([['yes', 0],
                          ['no', 0],
                          ['time_start', undefined]
      ]),
      cover: "none"
    });
    await freet.save(); // Saves freet to MongoDB
    return freet.populate('authorId');
  }

  /**
   * Find a freet by freetId
   *
   * @param {string} freetId - The id of the freet to find
   * @return {Promise<HydratedDocument<Freet>> | Promise<null> } - The freet with the given freetId, if any
   */
  static async findOne(freetId: Types.ObjectId | string): Promise<HydratedDocument<Freet>> {
    return FreetModel.findOne({_id: freetId}).populate('authorId');
  }

  /**
   * Get freets past a certain date
   * 
   * @param {Date} date - Cutoff for freets found
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of all of the freets
   */
  static async findSince(date: Date): Promise<Array<HydratedDocument<Freet>>> {
  // Retrieves freets from date onward, then sorts them most to least recent
  return FreetModel.find({dateModified:{$gte:date}}).sort({dateModified: -1}).populate('authorId');
  }

  /**
   * Get all the freets in the database
   *
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of all of the freets
   */
  static async findAll(): Promise<Array<HydratedDocument<Freet>>> {
    // Retrieves freets and sorts them from most to least recent
    return FreetModel.find({}).sort({dateModified: -1}).populate('authorId');
  }

  /**
   * Get all the freets in by given author
   *
   * @param {string} username - The username of author of the freets
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of all of the freets
   */
  static async findAllByUsername(username: string): Promise<Array<HydratedDocument<Freet>>> {
    const author = await UserCollection.findOneByUsername(username);
    return FreetModel.find({authorId: author._id}).populate('authorId');
  }

  /**
   * Get all the freets of authors in follows list
   *
   * @param {Array<Types.ObjectId>} follows - The usernames
   * @param {Date} date - Cutoff for freets found
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of all of the freets
   */
    static async findAllByFollowing(follows: Array<Types.ObjectId>, date: Date = new Date("01/01/1970")): Promise<Array<HydratedDocument<Freet>>> {
    return FreetModel.find({authorId : {$in : follows}, dateModified : {$gte : date}}).populate('authorId');
  }

  /**
   * Get all the freets of authors not in follows list
   *
   * @param {Array<Types.ObjectId>} follows - The usernames
   * @param {Date} date - Cutoff for freets found
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of all of the freets
   */
   static async findAllNotFollowing(follows: Array<Types.ObjectId>, date: Date = new Date("01/01/1970")): Promise<Array<HydratedDocument<Freet>>> {
    return FreetModel.find({authorId : {$nin : follows}, dateModified : {$gte : date}}).populate('authorId');
  }

  /**
   * 
   * @param {Date} date - Cutoff for freets found
   * @returns 
   */
  static async findVerified(date: Date = new Date("01/01/1970")): Promise<Array<HydratedDocument<Freet>>> {
    const freets = await this.findSince(date);
    const retFreets = [];
    for (let i = 0; i < freets.length; i++) {
      let singleFreet = await UserCollection.findOneByUserId(freets[i]._id);
      if (singleFreet) {
        if (singleFreet.verified) {
          retFreets.push(freets[i]);
        }
      }
    }
    return retFreets;
  }

  /**
   * Sort freets by best, hot, rising, or new
   * RI: sortType = {'best','hot','rising','new'}
   * @param {string} sortType - The sorting method
   * @return {Promise<HydratedDocument<Freet>[]>} - An array of freets sorted by criteria
   */
  static async sortType(freets: Array<HydratedDocument<Freet>>, sortType: string): Promise<Array<HydratedDocument<Freet>>> {

    // let freets = await this.findSince(since);

    // freets.filter(function(freet) {
    //   return Math.abs(freet.dateCreated.getTime() - new Date().getTime()) <= twoWeeks;
    // })

    // let randArr = new Array(freets.length).fill(1).map((scalar, index) => ((Math.random()/2)+0.75)*(scalar+(index/freets.length)));

    if (sortType === 'best') {
      return freets.sort((f1, f2) => (f1.votes[0]-f1.votes[1]) > (f2.votes[0]-f2.votes[1]) ? -1 : 1);
    }
    else if (sortType === 'hot') {
      return freets.sort((f1, f2) => (f1.votes[0]+(f1.votes[1]/2)) > (f2.votes[0]+(f2.votes[1]/2)) ? -1 : 1);
    }
    else if (sortType === 'rising') {
      return freets.sort((f1, f2) => 
      2*(0.5 + Math.max(0, 1-f1.dateCreated.getTime()/oneDay))*(f1.votes[0]-f1.votes[1]) > 
      2*(0.5 + Math.max(0, 1-f2.dateCreated.getTime()/oneDay))*(f2.votes[0]-f2.votes[1]) ? -1 : 1);
    }
    else if (sortType === 'new') {
      return freets.sort((f1, f2) => (f1.dateModified.getDate() < f2.dateModified.getDate()) ? -1 : 1);
    }
  }

  /**
   * Filter tweets by followed, verified, or both followed and other accounts.
   * @param {string} tabType - The tab filter
   * @param {string} sortType - The sorting method for the subset of freets
   * 
   * @return {Promise<Array<HydratedDocument<Freet>>>} - Subset of freets according to taba rules
   */
  static async chooseTab(userId: string | Types.ObjectId, tabType: string, sortType: string = "hot"): Promise<Array<HydratedDocument<Freet>>> {
    let user = await UserCollection.findOneByUserId(userId);
    let date: Date = new Date();
    let weekAgo: Date = new Date(date.getTime() - oneWeek);
    if (tabType === "home") {
      let followingFreets = await this.findAllByFollowing(user.follows, weekAgo);
      return await this.sortType(followingFreets, sortType);
    }

    else if (tabType === "verified") {
      let verifiedFreets = await this.findVerified(weekAgo);
      return await this.sortType(verifiedFreets, sortType);
    }

    else if (tabType === "discovery") {
      let followingFreets = await this.findAllByFollowing(user.follows, weekAgo);
      let notFollowingFreets = await this.findAllNotFollowing(user.follows, weekAgo);
      let mixedFreets = []
      for (let i = 0; i < notFollowingFreets.length; i++) {
        if (i%4 === 0) {
          mixedFreets.push(notFollowingFreets[Math.floor(Math.random()*notFollowingFreets.length)])
        }
        else {
          mixedFreets.push(followingFreets[Math.floor(Math.random()*followingFreets.length)])
        }
      }
      return await this.sortType(mixedFreets, sortType);
    }
  }

  /**
   * Upvote or downvote a freet, which influences the ranking and controversial status of the freet
   * @param freetId - The id of the freet to find
   * @param userId - The id of the user to find
   * @param voteType - Upvote or downvote
   */
  static async vote(freetId: Types.ObjectId | string, userId: Types.ObjectId | string, voteType: string): Promise<void> {
    const freet = await FreetModel.findOne({_id: freetId});
    const user = await UserModel.findOne({_id: userId});
    const userVote: string | undefined = user.votes.get(freet._id.toString());
    if (voteType === "upvote") {
      if (userVote) { 
        if (userVote === "upvote") {
          user.votes.delete(freet._id.toString());
          freet.votes[0] -= 1;
        }
        if (userVote === "downvote") {
          user.votes.set(freet._id.toString(), "upvote");
          freet.votes[0] += 1;
          freet.votes[1] -= 1;
        }
      }
      else {
        user.votes.set(freet._id.toString(), "upvote");
        freet.votes[0] += 1;        
      }
    }

    if (voteType === "downvote") {
      if (userVote) { 
        if (userVote === "upvote") {
          user.votes.set(freet._id.toString(), "downvote");
          freet.votes[0] -= 1;
          freet.votes[1] += 1;
        }
        if (userVote === "downvote") {
          user.votes.delete(freet._id.toString());
          freet.votes[1] -= 1;
        }
        else {
          user.votes.set(freet._id.toString(), "downvote");
          freet.votes[1] += 1;        
        }
      }
    }

    if (freet.votes[1]>freet.votes[0]) {
      freet.flag = true;
      freet.cover = "controversial";
    }

    else if (freet.votes[0]>freet.votes[1]) {
      freet.flag = false;
      freet.cover = "none";
    }
    await freet.save();
    await user.save();
  }
  /**
   * Report a freet as "spam", "misinformation", or "triggering", setting off an audit if enough reports are made
   * @param freetId - The id of the freet to find
   * @param reportType - Type of report
   */
  static async report(freetId: Types.ObjectId | string, userId: Types.ObjectId | string, reportType: string): Promise<void> {
    const freet = await FreetModel.findOne({_id: freetId});
    const user = await UserModel.findOne({_id: userId});
    const reportVal = freet.reports.get(reportType);
    
    if (freet.audit === "none") {
      if (user.reports.get(freet._id.toString())) {
        user.reports.delete(freet._id.toString());
        freet.reports.set(user.reports.get(freet._id.toString()), reportVal-1);
      }

      else {
        freet.reports.set(reportType, reportVal+1);
        user.reports.set(freet._id.toString(), reportType);
        
        //sum total reports of the freet
        let totalReports = 0;
        freet.reports.forEach(report => {
          totalReports += report;
        });
  
        if (freet.votes[1] > 10) {
          if (totalReports > freet.votes[1]/10) {
            freet.audit = "testing";
            freet.auditInfo.set("time_start", Date.now());
            freet.cover = _.max(Object.keys(freet.reports), i => freet.reports.get(i));
          }
        }
      }

    }
    await freet.save();
    await user.save();
  }

  /**
   * Audit a freet, removing or permanantly covering the post if there are enough confirming votes
   * @param freetId 
   * @param confirm 
   */
  static async auditVote(freetId: Types.ObjectId | string, confirm: boolean): Promise<void> {
    const freet = await FreetModel.findOne({_id: freetId});
    const auditYes = freet.auditInfo.get("yes");
    const auditNo = freet.auditInfo.get("no");
    if (confirm) {
      freet.auditInfo.set("yes", auditYes+1);
    }
    else {
      freet.auditInfo.set("no", auditNo+1);
    }

    if ((Date.now() - freet.auditInfo.get("time_start")) >= oneDay/2) {
      const auditRatio = freet.auditInfo.get("yes")/freet.auditInfo.get("no");
      if (auditRatio >= 2) {
        freet.audit = "failed";
      }
      else {
        freet.audit = "passed";
      }
    }

    if (freet.audit === "failed") {
      if (freet.status === "spam" || freet.status === "misinformation") {
        this.deleteOne(freetId);
      }
      if (freet.status === "triggering") {
        freet.cover = "triggering";
      }
    }
    await freet.save();
  }

  /**
   * Update a freet with the new content
   *
   * @param {string} freetId - The id of the freet to be updated
   * @param {string} content - The new content of the freet
   * @return {Promise<HydratedDocument<Freet>>} - The newly updated freet
   */
  static async updateOne(freetId: Types.ObjectId | string, content: string): Promise<HydratedDocument<Freet>> {
    const freet = await FreetModel.findOne({_id: freetId});
    freet.updateOne({_id: freetId}, {$set: {"content": content, "dateModified": new Date()}});
    await freet.save();
    return freet.populate('authorId');
  }

  /**
   * Delete a freet with given freetId.
   *
   * @param {string} freetId - The freetId of freet to delete
   * @return {Promise<Boolean>} - true if the freet has been deleted, false otherwise
   */
  static async deleteOne(freetId: Types.ObjectId | string): Promise<boolean> {
    const freet = await FreetModel.deleteOne({_id: freetId});
    return freet !== null;
  }

  /**
   * Delete all the freets by the given author
   *
   * @param {string} authorId - The id of author of freets
   */
  static async deleteMany(authorId: Types.ObjectId | string): Promise<void> {
    await FreetModel.deleteMany({authorId});
  }
}

export default FreetCollection;
