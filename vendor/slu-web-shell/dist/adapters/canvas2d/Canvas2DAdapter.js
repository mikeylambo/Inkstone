export class Canvas2DAdapter {
    canvas;
    context;
    id = "canvas2d";
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
    }
    resize(width, height, dpr) {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    async screenshot() {
        return new Promise((resolve) => this.canvas.toBlob(resolve));
    }
}
