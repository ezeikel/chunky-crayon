export const cacheLife = () => undefined;
export const cacheTag = () => undefined;
export const revalidatePath = () => undefined;
export const revalidateTag = () => undefined;
export const unstable_cache = <T extends (...args: never[]) => unknown>(
  fn: T,
) => fn;
