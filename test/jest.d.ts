/* eslint-disable no-var */

import { StoppedTestContainer } from 'testcontainers';

declare global {
  var __CONTAINERS__: (() => Promise<StoppedTestContainer>)[];
}
