import { TrainingExample } from '../interfaces/TrainingExample.interface';
import { CanvasParams } from '../interfaces/CanvasParams';
import { NeuralNet } from '../classes/NeuralNet';
import { NeuralNetConfig } from '../interfaces/NeuralNetConfig.interface';

export class TrainerApp {
    private ctx: CanvasRenderingContext2D;
    private images: HTMLImageElement[];
    private curNetData: Int8Array = new Int8Array(25);
    private net: NeuralNet;
    private openFile: HTMLInputElement;
    private imagesData: Int8Array[] = [];

    constructor(
        private trainerSet: TrainingExample[],
        cnvParams: CanvasParams,
        netParams: NeuralNetConfig
    ) {
        this.net = new NeuralNet(netParams, this.makeEmptyData());
        this.opneFileInit();
        this.initCanvas(cnvParams);
    }

    public loadNet() {
        const netJSON = localStorage.getItem('net');
        this.net.loadFromJSON(netJSON);
    }

    private opneFileInit() {
        this.openFile = <HTMLInputElement>document.getElementById('openImg');
        this.openFile.onchange = this.changeFile.bind(this);
    }

    private changeFile(e: any) {
        const reader = new FileReader();
        // console.log('change file!');
        reader.readAsDataURL(e.target.files[0]);
        reader.onloadend = this.fileOnLoad.bind(this);
    }

    private fileOnLoad(e: any) {
        // console.log('File load');
        const img = new Image();
        img.src = e.target.result;
        img.addEventListener('load', this.fileImagOnLoad.bind(this));
    }

    private fileImagOnLoad(e: any) {
        const data = this.getImageData(e.target);
        this.net.newDataSet(data)[0];
        this.net.start();
        console.warn(this.net);
    }

    private makeEmptyData(): Int8Array {
        const empty = new Int8Array(25);
        for (let i = 0; i < empty.length; i++) {
            empty[i] = 0;
        }
        return empty;
    }

    private initCanvas(cnvParams: CanvasParams): void {
        const cnv = <HTMLCanvasElement>document.getElementById(cnvParams.id);
        cnv.width = cnvParams.width;
        cnv.height = cnvParams.height;
        this.ctx = cnv.getContext('2d');
    }

    public initSet(trainerSet: TrainingExample[]): void {
        const promises: Promise<void>[] = [];
        this.images = trainerSet.map(trItem => {
            const imgElem = new Image(5, 5);
            imgElem.src = trItem.image;
            promises.push(this.initImgWait(imgElem));
            return imgElem;
        });
        Promise.all(promises).then(() => this.startTraining());
    }

    private initImgWait(imgElem: HTMLImageElement): Promise<void> {
        return new Promise((resolve: Function) => imgElem.addEventListener('load', () => resolve()));
    }

    private startTraining() {
        console.warn('Start training', this.net);
        let trained: boolean = false;
        let counter = 0;
        this.images.forEach(img => this.imagesData.push(this.getImageData(img)));
        while (!trained) {
            counter++;
            const errArr: number[] = [];
            for (let i = 0; i < this.imagesData.length; i++) {
                const arr = this.imagesData[i];
                const res = this.net.newDataSet(arr);
                if (this.trainerSet[i].isSquare) {
                    const currErr = 1 - res[0].err;
                    errArr.push(currErr);
                    this.net.backpropagation(1);
                } else {
                    const currErr = res[0].err;
                    errArr.push(currErr);
                    this.net.backpropagation(0);
                }
            }

            let summ: number = 0;
            for (let i = 0; i < errArr.length; i++) {
                const err = errArr[i];
                summ += err;
            }

            let avErr = summ / errArr.length;
            if (counter % 100000 === 0) {
                console.log(`Эпоха: ${counter}`);
                console.log(errArr, this.net);
                console.log(`Средняя ошибка ${avErr}`);
                localStorage.setItem('net', JSON.stringify(this.net));
            }

            if (avErr < 0.2 || counter === 500000) {
                trained = true;
            }
        }
        localStorage.setItem('net', JSON.stringify(this.net));
        console.log('ЗАВЕРШЕНО!');
        console.log(this.net, `Итераций: ${counter}`);
    }

    private about(idel: number, currnet: number) {

    }

    private getImageData(img: HTMLImageElement) {
        try {
            this.ctx.drawImage(img, 0, 0);
        } catch (e) {
            console.log(e);
        }
        const imgData: ImageData = this.ctx.getImageData(0, 0, 5, 5);
        return this.getPixelColor(imgData.data);
    }

    private getPixelColor(imageArray: Uint8ClampedArray) {
        const curImageData: Int8Array = new Int8Array(25);
        // Where: i - R chanel, i + 1 - G changel, i + 2 - B changel, i + 3 A chanel
        for (let i = 0, k = 0; i < imageArray.length; i += 4, k++) {
            if (imageArray[i] === 255 && imageArray[i + 1] === 255 && imageArray[i + 2] === 255) {
                curImageData[k] = 1;
            } else {
                curImageData[k] = 0;
            }
        }
        return curImageData;
    }
}