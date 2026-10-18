// アプリ全体で使う例外。ドメイン層・ユースケースはサブクラスを throw し、入口が通信用の封筒に詰める。
// 呼び出し側（brain の tasks.sh）にはコードとメッセージだけが届く。

export type ErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "INVALID" | "INTERNAL";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** 合言葉が無い・違う */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

/** 対象が存在しない */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

/** 入力が不正 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super("INVALID", message);
    this.name = "ValidationError";
  }
}

/** コードから対応するサブクラスを作り直す。対応するサブクラスが無いコード（INTERNAL）は AppError のまま */
export const toAppError = (code: ErrorCode, message: string): AppError => {
  switch (code) {
    case "UNAUTHORIZED":
      return new UnauthorizedError(message);
    case "NOT_FOUND":
      return new NotFoundError(message);
    case "INVALID":
      return new ValidationError(message);
    default:
      return new AppError(code, message);
  }
};
