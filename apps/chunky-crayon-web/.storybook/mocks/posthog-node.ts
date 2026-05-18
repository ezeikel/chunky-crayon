export class PostHog {
  capture() {}
  identify() {}
  shutdownAsync() {
    return Promise.resolve();
  }
}

export default PostHog;
