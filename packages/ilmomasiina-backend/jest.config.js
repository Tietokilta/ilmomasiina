const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

// ts-jest produces moduleNameMapper values starting with "../", which aren't resolvable
// relative to source files. We need to change them to absolute paths.
const moduleNameMapper = Object.fromEntries(
  Object.entries(pathsToModuleNameMapper(compilerOptions.paths))
    .map(([from, to]) => [from, `<rootDir>/${to}`])
);

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper,
  globalSetup: '<rootDir>/test/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
