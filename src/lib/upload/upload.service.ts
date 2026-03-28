import FormData from "form-data";
import axios from "axios";

export const uploadService = {
    uploadImage: async (fileBuffer: Buffer, fileName?: string): Promise<string> => {
        if (!fileBuffer) {
            throw new Error("No file provided");
        }

        const formData = new FormData();
        const base64Image = fileBuffer.toString('base64');
        formData.append('image', base64Image);

        if (fileName) {
            const name = fileName.split('.')[0];
            formData.append('name', `upload_${Date.now()}_${name}`);
        }

        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
            formData,
            {
                headers: { ...formData.getHeaders() },
                timeout: 30000
            }
        );

        if (response.data.success) {
            return response.data.data.url;
        } else {
            throw new Error(response.data.error?.message || 'Upload failed');
        }
    }
};