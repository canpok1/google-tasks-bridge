// GAS の入口。ここで公開した関数は、ビルド時に GAS の直下へ書き出される（vite.server.config.ts）。

import { createUseCases } from "../application/useCases";
import { createGasPorts } from "../infrastructure/gas/gasPorts";
import { createDispatcher } from "./dispatcher";
import { createRequestHandler } from "./request";

/** スクリプト プロパティに置く合言葉のキー */
const API_KEY_PROPERTY = "API_KEY";

const handle = createRequestHandler(createDispatcher(createUseCases(createGasPorts())), () =>
  PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY),
);

/** Web アプリへの POST。応答は常に JSON の封筒 */
export const doPost = (e: GoogleAppsScript.Events.DoPost) =>
  ContentService.createTextOutput(JSON.stringify(handle(e.postData?.contents))).setMimeType(
    ContentService.MimeType.JSON,
  );

/**
 * 合言葉を作り直してスクリプト プロパティに保存し、実行ログに出す。古い合言葉は使えなくなる。
 * エディタから手で実行する。初回の実行で Tasks の権限の承認も済む
 */
export const issueApiKey = () => {
  const key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty(API_KEY_PROPERTY, key);
  console.log(key);
};
