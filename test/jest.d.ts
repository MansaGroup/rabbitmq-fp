/* eslint-disable no-var */

import { StoppedTestContainer } from 'testcontainers';

import 'jest-extended';

declare global {
  var __CONTAINERS__: (() => Promise<StoppedTestContainer>)[];
}
