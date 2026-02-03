import PDFParser from "pdf2json"
import mammoth from "mammoth";
import { read, utils } from "xlsx"
import Tesseract from "tesseract.js";
import { rejects } from "assert";
class FileParseService {
    async parseFile(buffer: Buffer, fileType: string): Promise<string> {
        console.log(fileType)
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
        return new Promise((resolve, reject) => {
            const pdfParser = new PDFParser(null, true); // Add raw text mode

            pdfParser.on("pdfParser_dataError", (errData: any) => {
                console.error('❌ PDF Parser Error:', errData);
                reject(errData.parserError);
            });

            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                try {
                    const text = pdfParser.getRawTextContent();
                    console.log('🔍 PDF text extracted, length:', text?.length || 0);
                    resolve(text || '');
                } catch (err) {
                    console.error('❌ Error getting text content:', err);
                    resolve(''); // Resolve with empty string instead of rejecting
                }
            });

            pdfParser.parseBuffer(buffer);
        });
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