import dotenv from 'dotenv';
dotenv.config();
import { TwitterClient } from 'twitter-api-client';
import axios from 'axios';
import fs from 'fs';
import Jimp from 'jimp';
import { parseString } from 'xml2js';
import sharp from 'sharp';

const twitterClient = new TwitterClient({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  accessToken: process.env.CONSUMER_KEY,
  accessTokenSecret: process.env.CONSUMER_SECRET,
});

async function getLatestFollowers() {
  const data = await twitterClient.accountsAndUsers.followersList({
    screen_name: process.env.TWITTER_HANDLE,
    count: 3,
  });

  let count = 0;
  const downloads = new Promise((resolve, reject) => {
    data.users.forEach((user, index, arr) => {
      downloadImage(user.profile_image_url_https, `${index}.png`).then(() => {
        count++;
        if (count === arr.length) resolve();
      });
    });
  });

  downloads.then(() => {
    drawBanner();
  });
}

async function getLatestArticleHeadline() {
  let title = '';
  await axios.get(process.env.SITEMAP).then((data) => {
    parseString(data.data, function (err, data) {
      title = data.feed.entry[0].title[0];
    });
  });
  return title;
}

async function drawBanner() {
  const images = ['1500x500.jpg', '0.png', '1.png', '2.png'];
  const promiseArray = [];
  images.forEach((image) => promiseArray.push(Jimp.read(image)));
  promiseArray.push(getLatestArticleHeadline());
  promiseArray.push(Jimp.loadFont(Jimp.FONT_SANS_32_BLACK));

  Promise.all(promiseArray).then(
    ([banner, imageOne, imageTwo, imageThree, headline, font]) => {
      console.log(`Current headline: ${headline}`);
      banner.composite(imageOne, 1050, 80);
      banner.composite(imageTwo, 1158, 80);
      banner.composite(imageThree, 1264, 80);
      banner.print(font, 410, 410, headline);
      banner.write('1500x500.png', function () {
        uploadBanner();
      });
    }
  );
}

async function uploadBanner() {
  const base64 = await fs.readFileSync('1500x500.png', { encoding: 'base64' });
  await twitterClient.accountsAndUsers
    .accountUpdateProfileBanner({
      banner: base64,
    })
    .then((d) => {
      console.log('Upload to Twitter done');
    });
}

async function downloadImage(url, image_path) {
  await axios({
    url,
    responseType: 'arraybuffer',
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        resolve(sharp(response.data).resize(96, 96).toFile(image_path));
      })
  );
}

getLatestFollowers();
setInterval(() => {
  getLatestFollowers();
}, 60000);
