
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

import DOM, { Node } from './cdp/DOM.ts';
import { DOMNode, DOMSnapshotResultGetSnapshot } from "./cdp/DOMSnapshot.ts";
import DomInteractionsOperator from "./DomInteractionsOperator.ts";

import Page from "./cdp/Page.ts";
import DOMDebugger from './cdp/DOMDebugger.ts';

interface InteractibleElement {
    node: Node,
    boxModel: any,
    listeners: any
    nativeInteractions: any;
}

export default class VisualSnapshotTaker {
    page : Page;
    dom : DOM;
    domDebugger : DOMDebugger;
    interactor : DomInteractionsOperator;

    constructor(page : Page, dom : DOM, domDebugger : DOMDebugger, interactor : DomInteractionsOperator) {
        this.page = page;
        this.dom = dom;
        this.domDebugger = domDebugger;
        this.interactor = interactor;
    }

    async drawRects(imageBase64: string, snapshot: DOMSnapshotResultGetSnapshot) {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        let image = await loadImage(imageBuffer);

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0);

        await this.drawRectsOn(ctx, snapshot.domNodes[0], snapshot);

        const buffer = canvas.toBuffer('image/jpeg', { quality: 1 });
        const base64Output = buffer.toString('base64');
        return base64Output;
    }
        
    async drawRectsOn(ctx:any, node: DOMNode, snapshot: DOMSnapshotResultGetSnapshot) {
        let draw = false;
        if (node.nodeName === "A") {
            draw = true;
        }
        if (node.eventListeners && node.eventListeners.length !== 0) {
            draw = true;
        }

        if (draw && node.layoutNodeIndex) {
            let layout = snapshot.layoutTreeNodes[node.layoutNodeIndex];
            let boundingBox = layout.boundingBox;
            let x = boundingBox.x;
            let y = boundingBox.y;
            let width = boundingBox.width;
            let height = boundingBox.height;
            this.drawOnCtx(ctx, node.backendNodeId.toString(), x, y, height, width);
        }

        if (node.childNodeIndexes) {
            for (let  [index, childNodeIndex] of node.childNodeIndexes.entries()) {
            let child = snapshot.domNodes[childNodeIndex];
                await this.drawRectsOn(ctx, child, snapshot);
            }
        }
    }

    async draw(imageBase64: string, x: number, y: number, h: number, w: number, id: number): Promise<string> {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        let image = await loadImage(imageBuffer);

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0);

        this.drawOnCtx(ctx, id.toString(), x, y, w, h);

        const buffer = canvas.toBuffer('image/jpeg', { quality: 1 });
        const base64Output = buffer.toString('base64');
        return base64Output;
    }

    drawOnCtx(ctx : any, label: string, x: number, y: number, h: number, w: number) {
        const rect = {
            x: x,
            y: y,
            width: w,
            height: h
        };
        // Draw rectangle
        ctx.fillStyle = 'green'; // green with 50% opacity
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // Set font and measure text
        ctx.font = '20px sans-serif';
        const padding = 4;
        const textWidth = ctx.measureText(label).width;
        const textHeight = 48; // Manually estimated height for 20px font

        // Draw red background behind the text
        ctx.fillStyle = 'green'; // green with 50% opacity
        ctx.fillRect(rect.x + (rect.width / 2), rect.y, textWidth + 2 * padding, textHeight);

        // Draw blue text over the red background
        ctx.fillStyle = 'yellow'; // green with 50% opacity
        ctx.fillText(label, rect.x + padding + (rect.width / 2), rect.y + textHeight - 6); // Adjust baseline
    }

    async mergeImages2(originalImageBase64: string, imageBase64: string) {
        let img1 = await loadImage(Buffer.from(originalImageBase64, 'base64'));
        let img2 = await loadImage(Buffer.from(imageBase64, 'base64'));

        const canvas = createCanvas(img1.width, img1.height);
        const ctx = canvas.getContext('2d');

        // Draw first image at full opacity
        ctx.drawImage(img1, 0, 0, canvas.width, canvas.height);

        // Set 50% opacity for the second image
        ctx.globalAlpha = 0.5;

        // Draw second image on top
        ctx.drawImage(img2, 0, 0, canvas.width, canvas.height);

        // Reset opacity to default
        ctx.globalAlpha = 1.0;

        const buffer = canvas.toBuffer('image/jpeg', { quality: 1 });
        const base64Output = buffer.toString('base64');

        return base64Output;
    }

    async mergeImages(originalImageBase64: string, imageBase64: string) {
        let image1 = await loadImage(Buffer.from(originalImageBase64, 'base64'));
        const canvas1 = createCanvas(image1.width, image1.height);
        const ctx1 = canvas1.getContext('2d');
        ctx1.drawImage(image1, 0, 0);
        const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);

        let image2 = await loadImage(Buffer.from(imageBase64, 'base64'));
        const canvas2 = createCanvas(image2.width, image2.height);
        const ctx2 = canvas2.getContext('2d');
        ctx2.drawImage(image2, 0, 0);
        const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
        for (let i = 0; i < imageData2.data.length; i += 4) {
            if (imageData1.data[i] !== imageData2.data[i]
                || imageData1.data[i + 2] !== imageData2.data[i + 1]
                || imageData1.data[i + 2] !== imageData2.data[i + 2]) {
                imageData2.data[i] = (imageData1.data[i] + imageData2.data[i]) / 2;
                imageData2.data[i + 1] = (imageData1.data[i + 1] + imageData2.data[i + 1]) / 2;
                imageData2.data[i + 2] = (imageData1.data[i + 2] + imageData2.data[i + 2]) / 2;
            }
        }
        ctx2.putImageData(imageData2, 0, 0);

        const buffer = canvas2.toBuffer('image/jpeg', { quality: 1 });
        const base64Output = buffer.toString('base64');

        return base64Output;
    }

    async dumpImage(imageBase64: string, name: string) {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        let image = await loadImage(imageBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const out = fs.createWriteStream(name);
        const stream = canvas.createJPEGStream();
        stream.pipe(out);
    }

    async crop(imageBase64: string, x: number, y: number, width: number, height: number) {
        const imageBuffer = Buffer.from(imageBase64, 'base64');

        let image = await loadImage(imageBuffer);

        if (x === -1) {
            x = 0;
        }
        if (y === -1) {
            y = 0;
        }
        if (width === -1) {
            width = image.width;
        }
        if (height === -1) {
            height = image.height;
        }

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        // Set canvas size to cropped image size
        canvas.width = width;
        canvas.height = height;

        // Draw the cropped image portion onto the canvas
        ctx.drawImage(
            image,
            x, y,            // Start cropping from (x, y) on the image
            width, height,   // Crop width and height
            0, 0,                    // Place at top-left of canvas
            width, height    // Draw at original size
        );

        const buffer = canvas.toBuffer('image/jpeg', { quality: 1 });
        const base64Output = buffer.toString('base64');

        return base64Output;
    }
    async takeImage() {
        let originalImageBase64: string = await this.page.captureScreenshot();
        originalImageBase64 = await this.page.captureScreenshot();
        return await this.dumpImage(originalImageBase64, 'imgOriginal.jpg');
    }

    async enrichImage(node: Node, imageBase64: string) {
        let interactElemenBoxes = await this.getInteractibleElementBoxes(node);
        for (let intarElemBox of interactElemenBoxes) {
            // 2 == window.devicePixelRatio
            let x = intarElemBox.boxModel.margin[0] * 2;
            let y = intarElemBox.boxModel.margin[1] * 2;
            let width = intarElemBox.boxModel.width * 2;
            let height = intarElemBox.boxModel.height * 2;
            //await cdp.overlay.highlightNode(node.backendNodeId);
            imageBase64 = await this.draw(imageBase64, x, y, height, width, node.backendNodeId);
        }
        return imageBase64;
    }

    async getInteractibleElementBoxes(node: Node): Promise<InteractibleElement[]> {
        let toReturn: InteractibleElement[] = [];

        let pNodeResolved = await this.dom.resolveNode(node.nodeId);
        if (pNodeResolved.objectId) {
            let listeners: any = await this.domDebugger.getEventListeners(pNodeResolved.objectId);
            let nativeInteractions: any = await this.interactor.getNativeInteractions(node);
            if (listeners.length !== 0 || nativeInteractions) {
                try {
                    let boxModel = await this.dom.getBoxModel(node.nodeId, node.backendNodeId);
                    toReturn.push({
                        node: node,
                        boxModel: boxModel,
                        listeners: listeners,
                        nativeInteractions: nativeInteractions
                    })
                } catch (e: any) {

                }
            }
        }

        if (node['nodeName'] !== "#text") {
            if (node.children) {
                for (let child of node.children) {
                    toReturn = toReturn.concat(await this.getInteractibleElementBoxes(child));
                }
            }
        }

        return toReturn;
    }
}