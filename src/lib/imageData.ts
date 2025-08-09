// Define a structure for our image data for type safety
export interface ImageInfo {
  src: string;
  alt: string;
  location: string;
  representation: string;
}

// An array to hold all major page images from online sources (can be removed if unused)
export const pageImages: ImageInfo[] = [
  // ... can be empty for now
];

// A central place to manage local assets
export const localAssets = {
  // We are pointing directly to the image in the root of the 'public' folder.
  // Make sure your mosaic.jpg is in `public/mosaic.jpg`.
  heroBackground: {
    src: '/mosaic.jpg', 
    alt: 'Abstract mosaic pattern creating a futuristic background',
  }
};