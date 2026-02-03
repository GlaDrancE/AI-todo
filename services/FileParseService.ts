import { PDFParse } from "pdf-parse"
import mammoth from "mammoth";
import { read, utils } from "xlsx"
import Tesseract from "tesseract.js";
class FileParseService {
    async parseFile(buffer: Buffer, fileType: string): Promise<string> {
        try {
            if (fileType.includes('pdf')) {
                return await this.parsePdf(buffer);
            } else if (fileType.includes('word') || fileType.includes('document')) {
                return await this.parseDoc(buffer);
            } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
                return await this.parseExcel(buffer);
            } else if (fileType.includes('image')) {
                return await this.parseImage(buffer);
            }
            return '';
        } catch (error) {
            console.error('Error parsing file:', error);
            return '';
        }
    }

    private async parsePdf(buffer: Buffer): Promise<string> {
        const data = new PDFParse({ data: buffer })
        return (await data.getText()).text;
    }
    private async parseDoc(buffer: Buffer): Promise<string> {
        const doc = await mammoth.extractRawText({ buffer })
        return doc.value
    }
    private async parseExcel(buffer: Buffer): Promise<string> {
        const workbook = read(buffer, { type: "buffer" })
        let text = "";

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            const csv = utils.sheet_to_csv(sheet)
            text += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
        })
        return text;
    }

    private async parseImage(buffer: Buffer): Promise<string> {
        const result = await Tesseract.recognize(buffer, "eng");
        return result.data.text;
    }
    extractMetadata(text: string, fileType: string) {
        return {
            wordCount: text.split(/\s+/).length,
            characterCount: text.length,
            hasNumbers: /\d/.test(text),
            hasEmails: /\S+@\S+\.\S+/.test(text),
            hasUrls: /https?:\/\/\S+/.test(text),
        };
    }

}
export default FileParseService