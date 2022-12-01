import type {Types, PopulatedDoc, Document} from 'mongoose';
import {Schema, model} from 'mongoose';
import type {User} from '../user/model';

/**
 * This file defines the properties stored in a Freet
 * DO NOT implement operations here ---> use collection file
 */

// Type definition for Freet on the backend
export type Freet = {
  _id: Types.ObjectId; // MongoDB assigns each object this ID on creation
  authorId: Types.ObjectId;
  dateCreated: Date;
  content: string;
  dateModified: Date;

  // Voting and moderation attributes
  votes: Array<number>;
  reports: Map<string, number>;
  flag: boolean;
  status: string;
  audit: string;
  auditInfo: Map<string, number>;
  cover: string;

  // Tabs and feed attributes
};

export type PopulatedFreet = {
  _id: Types.ObjectId; // MongoDB assigns each object this ID on creation
  authorId: User;
  dateCreated: Date;
  content: string;
  dateModified: Date;
    
  // Voting and moderation attributes
  votes: Array<number>;
  reports: Map<string, number>;
  flag: boolean;
  status: string;
  audit: string;
  auditInfo: Map<string, number>;
  cover: string;
};

// Mongoose schema definition for interfacing with a MongoDB table
// Freets stored in this table will have these fields, with the
// type given by the type property, inside MongoDB
const FreetSchema = new Schema<Freet>({
  // The author userId
  authorId: {
    // Use Types.ObjectId outside of the schema
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  // The date the freet was created
  dateCreated: {
    type: Date,
    required: true
  },
  // The content of the freet
  content: {
    type: String,
    required: true
  },
  // The date the freet was modified
  dateModified: {
    type: Date,
    required: true
  },
  // The upvotes (index 0) and downvotes (index 1) of the freet
  votes: [{
    type: Number,
    required: true
  }],
  // Reports, index 0 == spam, index 1 == misleading, index 2 == offensive
  reports: {
    type: Map,
    of: Number
  },
  // If dislikes > likes, flag is true, marking as controversial
  flag: {
    type: Boolean,
    required: true
  },
  // Type of post, “good” or “misinformation” or “triggering” or “spam”
  status: {
    type: String,
    required:true
  },
  // Audit status, “none” or “testing” or “passed” or “failed”
  audit: {
    type: String,
    required: true
  },
  // Votes for audit, index 0 == vote to remove, index 1 == vote to keep, index 2 == ms since start
  auditInfo: {
    type: Map,
    of: Number
  },
  cover: {
    type: String,
    required: true
  }
});

const FreetModel = model<Freet>('Freet', FreetSchema);
export default FreetModel;
