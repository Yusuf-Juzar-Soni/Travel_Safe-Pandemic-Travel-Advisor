const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const jwtDecode = require('jwt-decode');
const config = require('../config/config');
const kafka = require('../kafka/client');
const { checkAuth } = require('../config/passport');

const router = express.Router();

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  region: config.AWS_REGION,
});

const userImageUpload = multer({
  storage: multerS3({
    s3,
    bucket: config.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      cb(
        null,
        `userImages/${jwtDecode(req.headers.authorization).id}_${Date.now()}${file.originalname}`,
      );
    },
  }),
}).single('image');

const groupImageUpload = multer({
  storage: multerS3({
    s3,
    bucket: config.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      cb(
        null,
        `groupImages/${req.params.groupName}_${Date.now()}${file.originalname}`,
      );
    },
  }),
}).single('groupImage');

const {USERUPDATEIMAGEHANDLER}=require('../kafka/topics');

router.put(
  '/user',
  checkAuth,
  userImageUpload,
  (req, res) => {
    req.body.path = 'user-update-image';
    if (req.file) {
      req.body.fileUrl = req.file.location;
    }
    const token = req.headers.authorization;
    const decoded = jwtDecode(token);
    req.body.userId = decoded.id;

    kafka.make_request(USERUPDATEIMAGEHANDLER, req.body, (err, results) => {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ message: 'SOMETHING_WENT_WRONG' }));
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          image: results.message.avatarURL,
          message: 'PROFILE_UPDATE_IMAGE_SUCCESS',
        }));
      }
    });
  },
);

const {GROUPUPDATEIMAGEHANDLER}=require('../kafka/topics');

router.put(
  '/group/:groupName',
  checkAuth,
  groupImageUpload,
  (req, res) => {
    req.body.path = 'group-update-image';
    if (req.file) {
      req.body.fileUrl = req.file.location;
    }

    kafka.make_request(GROUPUPDATEIMAGEHANDLER, req.body, (err, results) => {
      if (err) {
        res.json({
          status: 'error',
          msg: 'System Error, Try Again.',
        });
      } else {
        res.status(200).send(results.message.avatarURL);
      }
    });
  },
);

module.exports = router;
