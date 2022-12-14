import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import FreetCollection from './collection';
import * as userValidator from '../user/middleware';
import * as freetValidator from '../freet/middleware';
import * as util from './util';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Get all the freets
 *
 * @name GET /api/freets
 *
 * @return {FreetResponse[]} - A list of all the freets sorted in descending
 *                      order by date modified
 */
/**
 * Get freets by author.
 *
 * @name GET /api/freets?authorId=id
 *
 * @return {FreetResponse[]} - An array of freets created by user with id, authorId
 * @throws {400} - If authorId is not given
 * @throws {404} - If no user has given authorId
 *
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if authorId query parameter was supplied
    if (req.query.author !== undefined) {
      next();
      return;
    }

    const allFreets = await FreetCollection.findAll();
    const response = allFreets.map(util.constructFreetResponse);
    res.status(200).json(response);
  },
  [
    userValidator.isAuthorExists
  ],
  async (req: Request, res: Response) => {
    const authorFreets = await FreetCollection.findAllByUsername(req.query.author as string);
    const response = authorFreets.map(util.constructFreetResponse);
    res.status(200).json(response);
  }
);

/**
 * Create a new freet.
 *
 * @name POST /api/freets
 *
 * @param {string} content - The content of the freet
 * @return {FreetResponse} - The created freet
 * @throws {403} - If the user is not logged in
 * @throws {400} - If the freet content is empty or a stream of empty spaces
 * @throws {413} - If the freet content is more than 140 characters long
 */
router.post(
  '/',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isValidFreetContent
  ],
  async (req: Request, res: Response) => {
    const userId = (req.session.userId as string) ?? ''; // Will not be an empty string since its validated in isUserLoggedIn
    const freet = await FreetCollection.addOne(userId, req.body.content);
    const freetResponse = await util.constructFreetResponse(freet);
    res.status(201).json({
      message: 'Your freet was created successfully.',
      freet: freetResponse
    });
  }
);

/**
 * Delete a freet
 *
 * @name DELETE /api/freets/:id
 *
 * @return {string} - A success message
 * @throws {403} - If the user is not logged in or is not the author of
 *                 the freet
 * @throws {404} - If the freetId is not valid
 */
router.delete(
  '/:freetId?',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isFreetExists,
    freetValidator.isValidFreetModifier
  ],
  async (req: Request, res: Response) => {
    await FreetCollection.deleteOne(req.params.freetId);
    res.status(200).json({
      message: 'Your freet was deleted successfully.'
    });
  }
);

/**
 * Modify a freet
 *
 * @name PUT /api/freets/:id
 *
 * @param {string} content - the new content for the freet
 * @return {FreetResponse} - the updated freet
 * @throws {403} - if the user is not logged in or not the author of
 *                 of the freet
 * @throws {404} - If the freetId is not valid
 * @throws {400} - If the freet content is empty or a stream of empty spaces
 * @throws {413} - If the freet content is more than 140 characters long
 */
router.put(
  '/:freetId?',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isFreetExists,
    freetValidator.isValidFreetModifier,
    freetValidator.isValidFreetContent
  ],
  async (req: Request, res: Response) => {
    const freet = await FreetCollection.updateOne(req.params.freetId, req.body.content);
    const freetResponse = await util.constructFreetResponse(freet);
    res.status(200).json({
      message: 'Your freet was updated successfully.',
      freet: freetResponse
    });
  }
);

/**
 * NEW QUERIES
 */

/**
 * Get freets by tabType and sortType.
 *
 * @name POST /api/freets/:tabType?sortType=${fields.sortType}
 *
 * @return {FreetResponse[]} - An array of freets to display in feed
 */
 router.post(
  '/feed/:tabType?',
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if tabType and sortType query parameter was supplied
    if ((req.params.tabType !== undefined) && (req.query.sortType !== undefined)) {
      next();
      return;
    }
    const defaultFeed = await FreetCollection.chooseTab(req.session.userId as string, "home", "best");
    const response = await Promise.all(defaultFeed.map(util.constructFreetResponse));
    res.status(200).json(response);
  },
  [
    userValidator.isUserLoggedIn
  ],
  async (req: Request, res: Response) => {
    const matchingFreets = await FreetCollection.chooseTab(req.session.userId as string, req.params.tabType, req.query.sortType as string);
    const response = await Promise.all(matchingFreets.map(util.constructFreetResponse));
    res.status(200).json(response);
  }
);

/**
 * Vote on a freet
 *
 * @name PUT /api/freets/vote/:id?
 *
 * @param {string} voteType - upvote or downvote
 * @return {FreetResponse} - the updated freet
 * @throws {403} - if the user is not logged in
 * @throws {404} - if the freetId is not valid
 */
 router.put(
  '/vote/:freetId?',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isFreetExists
  ],
  async (req: Request, res: Response) => {
    await FreetCollection.vote(req.params.freetId, req.session.userId, req.query.voteType as string);
    let freetResponse = util.constructFreetResponse(await FreetCollection.findOne(req.params.freetId));
    res.status(200).json({
      message: 'Your vote has been recorded.',
      freet: freetResponse
    });
  }
);

/**
 * Report a freet
 *
 * @name PUT /api/freets/report/:id?
 *
 * @param {string} freetId - id of freet
 * @param {string} reportType - 'spam' or 'triggering' or 'misinformation' report
 * @throws {403} - if the user is not logged in
 * @throws {404} - if the freetId is not valid
 */
 router.put(
  '/report/:freetId?',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isFreetExists
  ],
  async (req: Request, res: Response) => {
    await FreetCollection.report(req.params.freetId, req.session.userId, req.query.reportType as string);
    let freetResponse = util.constructFreetResponse(await FreetCollection.findOne(req.params.freetId));
    res.status(200).json({
      message: 'Your report has been recorded.',
      freet: freetResponse
    });
  }
);

/**
 * Audit a freet
 *
 * @name PUT /api/freets/auditvote/:id
 *
 * @param {string} freetId - id of freet
 * @param {string} confirm - confirm if freet should be moderated
 * @throws {403} - if the user is not logged in
 * @throws {404} - if the freetId is not valid
 */
 router.put(
  '/auditvote/:freetId?',
  [
    userValidator.isUserLoggedIn,
    freetValidator.isFreetExists,
    freetValidator.isAudited
  ],
  async (req: Request, res: Response) => {
    await FreetCollection.auditVote(req.params.freetId, req.query.confirm == 'true' ? true : false);
    let freetResponse = util.constructFreetResponse(await FreetCollection.findOne(req.params.freetId));
    res.status(200).json({
      message: 'Your audit vote has been recorded.',
      freet: freetResponse
    });
  }
);

export {router as freetRouter};
