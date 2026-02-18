import { supabaseBrowser } from '@/lib/supabaseClient';

export interface Attachment {
    type: 'image' | 'file';
    url?: string; // For PDFs/Files
    base64?: string; // For Images
    name: string;
    size?: number;
}

export const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const uploadFileToSupabase = async (file: File): Promise<string | null> => {
    if (!supabaseBrowser) {
        console.error("Supabase client not initialized");
        return null;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt upload to 'documents' bucket
        const { error } = await supabaseBrowser.storage
            .from('documents')
            .upload(filePath, file);

        if (error) {
            console.error('Supabase Upload Error:', error);
            // If bucket doesn't exist, we can't create it from client usually.
            // Just return null so UI can show error.
            return null;
        }

        const { data: publicData } = supabaseBrowser.storage
            .from('documents')
            .getPublicUrl(filePath);

        return publicData.publicUrl;
    } catch (error) {
        console.error('Supabase Upload Exception:', error);
        return null;
    }
};
