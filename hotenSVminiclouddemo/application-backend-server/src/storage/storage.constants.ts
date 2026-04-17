export const STORAGE_MODULE_OPTIONS = Symbol('STORAGE_MODULE_OPTIONS');

export type StorageModuleOptions = {
  publicBaseUrl: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  objectPrefix: string;
  region?: string;
  requestTimeoutMs?: number;
};

export type UploadUrlResult = {
  uploadUrl: string;
  publicUrl: string;
  bucket: string;
  objectKey: string;
  headers: Record<string, string>;
};
