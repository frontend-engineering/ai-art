/**
 * 腾讯云OSS服务模块
 * 处理图片上传到腾讯云COS
 */

const COS = require('cos-nodejs-sdk-v5');

// 腾讯云OSS配置
const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION;
const COS_DOMAIN = process.env.COS_DOMAIN;

// 初始化COS实例
let cos = null;

function initCOS() {
  if (!cos && process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY) {
    cos = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
    });
  }
  return cos;
}

/**
 * 上传图片到腾讯云OSS
 * @param base64Image Base64编码的图片数据
 * @returns 上传后的图片URL
 */
async function uploadImageToOSS(base64Image) {
  return new Promise((resolve, reject) => {
    try {
      const cosInstance = initCOS();
      
      if (!cosInstance || !COS_BUCKET || !COS_REGION || !COS_DOMAIN) {
        throw new Error('腾讯云OSS配置未设置，请检查.env文件中的配置');
      }
      
      // 移除Base64数据URI前缀
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      // 将Base64转换为Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 获取MIME类型
      let mimeType = 'image/jpeg';
      if (base64Image.startsWith('data:image/png')) {
        mimeType = 'image/png';
      } else if (base64Image.startsWith('data:image/gif')) {
        mimeType = 'image/gif';
      }
      
      // 生成文件名
      const fileExtension = mimeType.split('/')[1];
      const fileName = `art-photos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      
      // 上传到COS
      cosInstance.putObject({
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: mimeType
      }, function(err, data) {
        if (err) {
          console.error('上传到OSS失败:', err);
          reject(new Error('图片上传失败，请稍后重试'));
        } else {
          const url = `https://${COS_DOMAIN}/${fileName}`;
          console.log('上传到OSS成功:', url);
          resolve(url);
        }
      });
    } catch (error) {
      console.error('上传图片到OSS失败:', error);
      reject(new Error('图片上传失败，请稍后重试'));
    }
  });
}

/**
 * 上传视频到腾讯云OSS
 * @param base64Video Base64编码的视频数据
 * @param mimeType 视频MIME类型
 * @returns 上传后的视频URL
 */
async function uploadVideoToOSS(base64Video, mimeType = 'video/mp4') {
  return new Promise((resolve, reject) => {
    try {
      const cosInstance = initCOS();
      
      if (!cosInstance || !COS_BUCKET || !COS_REGION || !COS_DOMAIN) {
        throw new Error('腾讯云OSS配置未设置');
      }
      
      const base64Data = base64Video.replace(/^data:video\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileExtension = mimeType.split('/')[1] || 'mp4';
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      
      cosInstance.putObject({
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: mimeType
      }, function(err, data) {
        if (err) {
          console.error('上传视频到OSS失败:', err);
          reject(new Error('视频上传失败'));
        } else {
          const url = `https://${COS_DOMAIN}/${fileName}`;
          console.log('上传视频到OSS成功:', url);
          resolve(url);
        }
      });
    } catch (error) {
      console.error('上传视频到OSS失败:', error);
      reject(error);
    }
  });
}

module.exports = {
  initCOS,
  uploadImageToOSS,
  uploadVideoToOSS,
  COS_BUCKET,
  COS_REGION,
  COS_DOMAIN
};
