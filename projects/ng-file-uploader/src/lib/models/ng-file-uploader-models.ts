export interface IUploadOptions {
    concurrency: number;
    allowedFileTypes?: Array<string>;
    maxFileUploads?: number;
    maxFileSize?: number;
    logs?: boolean;
}

export interface IUploadOutput {
    type: 'addedToQueue' | 'allAddedToQueue' | 'uploading' | 'done' | 'start' | 'cancelled' | 'dragOver'
    | 'dragOut' | 'drop' | 'removed' | 'removedAll' | 'rejected' | 'error';
    file?: ISelectedFile;
    progress?: IUploadProgress;
    response?: any;
}

export interface ISelectedFile {
    id: string;
    fileIndex: number;
    name: string;
    type: string;
    progress?: IUploadProgress;
    nativeFile?: File;
    formData?: FormData;
    response?: any;
}

export interface IUploadProgress {
    status: 'Queue' | 'Uploading' | 'Done' | 'Cancelled';
    data?: {
        percentage: number;
        speed: number;
        speedHuman: string;
        startTime: number | null;
        endTime: number | null;
        eta: number | null;
        etaHuman: string | null;
    };
}

export interface IUploadInput {
    type: 'uploadAll' | 'uploadFile' | 'cancel' | 'cancelAll' | 'remove' | 'removeAll';
    url?: string;
    method?: string;
    id?: string;
    fieldName?: string;
    fileIndex?: number;
    file?: ISelectedFile;
    data?: { [key: string]: string | Blob };
    formData?: FormData;
    headers?: { [key: string]: string };
    withCredentials?: boolean;
}
