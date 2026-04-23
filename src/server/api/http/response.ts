import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  data: T;
  meta: {
    requestId: string;
  };
};

export function ok<T>(requestId: string, data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      data,
      meta: { requestId },
    },
    { status },
  );
}
