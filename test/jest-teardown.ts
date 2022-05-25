export default async function () {
  console.log('Stopping containers...');
  await Promise.all(globalThis.__CONTAINERS__.map((fn) => fn()));
}
