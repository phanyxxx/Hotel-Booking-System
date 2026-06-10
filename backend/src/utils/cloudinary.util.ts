import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'hotels'
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `hotel-management/${folder}`,
    });
    
    // Delete local file after upload
    fs.unlinkSync(filePath);
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  folder: string = 'hotels'
): Promise<string[]> => {
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.path, folder)
  );
  return Promise.all(uploadPromises);
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};