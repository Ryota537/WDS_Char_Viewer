import { OBSWebSocket } from 'obs-websocket-js';
import { sound, filters } from "@pixi/sound";

export interface IRecordController {
  start(): void;
  stop(): void;
  setFileName?(name: string): void;
}

export class MediaRecorderController implements IRecordController {
  protected _recorder: MediaRecorder | null = null
  protected _fileName: string = `wds_adv_record_${new Date().valueOf()}.mkv`

  constructor(recorder: MediaRecorder | null = null) {
    this._recorder = recorder;
  }

  public static create(stream: MediaStream, mimeType: string = 'video/webm; codecs=vp9'): MediaRecorderController {
    const self = new this();
    const captureStream = new MediaStream();
    const streamFilter = new filters.StreamFilter();
    streamFilter.stream.getAudioTracks().forEach((track) => {
      captureStream.addTrack(track);
    });
    sound.filtersAll = [streamFilter];
    try {
      captureStream.getAudioTracks().forEach(element => {
        stream.addTrack(element);
      });
    } catch (error) {
      alert("Failed to capture audio: " + (error instanceof Error ? error.message : error));
    }
    self._recorder = new MediaRecorder(stream);
    self._fileName = `wds_adv_record_${new Date().valueOf()}.mkv`;

    self._recorder.ondataavailable = (e) => {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error stopping tracks:', error);
      }
      const videoBlob = new Blob([e.data], { type: mimeType });
      const videoURL = URL.createObjectURL(videoBlob);
      console.log(videoURL); // 视频文件URL，可用于下载或播放
      const link = document.createElement('a');
      link.href = videoURL;
      link.download = self._fileName;
      link.click();
    };

    return self;
  }

  public start(): void {
    this._recorder?.start();
  }

  public stop(): void {
    this._recorder?.stop();
  }

  public setFileName(name: string): void {
    this._fileName = name;
  }
}

export class OBSController implements IRecordController {
  protected _url: string = 'ws://localhost:4455';
  protected _password?: string;
  protected _identificationParams?: object;
  protected _obs: OBSWebSocket;

  constructor(obs: OBSWebSocket) {
    this._obs = obs;
  }

  public static async create(url: string = 'ws://localhost:4455', password?: string, identificationParams?: object): Promise<OBSController> {
    const self = new this(new OBSWebSocket());
    self._obs = new OBSWebSocket();
    self._url = url;
    self._password = password;
    self._identificationParams = identificationParams;

    await self._connect();

    return self;
  }

  protected async _connect(): Promise<boolean> {
    try {
      const {
        obsWebSocketVersion,
        negotiatedRpcVersion
      } = await this._obs.connect(this._url, this._password, this._identificationParams);
      console.log(`Connected to OBS WebSocket Server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`)
      return true;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
        console.error('Failed to connect to OBS WebSocket Server', (error as any).code, (error as any).message);
      } else {
        console.error('Failed to connect to OBS WebSocket Server', error);
      }
      return false;
    }
  }

  protected async _disconnect(): Promise<boolean> {
    try {
      await this._obs.disconnect();
      console.log('OBS disconnected!');
      return true;
    } catch (error) {
      console.error('Failed to disconnect from OBS', error);
      return false;
    }
  }

  public async start(): Promise<void> {
    await this._obs.call('StartRecord');
  }

  public async stop(): Promise<void> {
    await this._obs.call('StopRecord');
    await this._disconnect();
  }
}