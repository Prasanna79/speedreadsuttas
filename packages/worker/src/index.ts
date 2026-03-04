export interface Env {
  SUTTA_TEXT: R2Bucket;
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({
      service: 'palispeedread-worker',
      status: 'ok',
    });
  },
};
