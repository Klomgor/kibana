/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { readdirSync, statSync, readFile } from 'fs';
import { promisify } from 'util';

import { partition } from 'lodash';
import type { Logger } from '@kbn/core/server';

import { ToolingLog } from '@kbn/tooling-log';

import {
  generatePackageInfoFromArchiveBuffer,
  _generatePackageInfoFromPaths,
} from '../../server/services/epm/archive/parse';

const readFileAsync = promisify(readFile);

export const TEST_PACKAGE_DIRECTORIES = [
  '../../../../../test/fleet_api_integration/apis/fixtures/bundled_packages',
  '../../../../../test/fleet_api_integration/apis/fixtures/test_packages',
  '../../../../../test/fleet_api_integration/apis/fixtures/package_verification/packages',
];

const getAllPathsFromDir = (dir: string): string[] =>
  readdirSync(dir).flatMap((file) => {
    const joinedPath = path.join(dir, file);
    if (!statSync(joinedPath).isDirectory()) return joinedPath;

    return getAllPathsFromDir(joinedPath);
  });

const getAllPackagesFromDir = (packagesDir: string) =>
  readdirSync(packagesDir).flatMap((packageDir) => {
    const packagePath = path.join(packagesDir, packageDir);

    if (packagePath.endsWith('.zip')) return packagePath;

    if (!statSync(packagePath).isDirectory()) return [];

    return readdirSync(packagePath)
      .map((version) => path.join(packagePath, version))
      .filter((versionPath) => statSync(versionPath).isDirectory() || packagePath.endsWith('.zip'));
  });

export const run = async () => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const { errors } = await verifyAllTestPackages(logger);

  if (errors.length) {
    logger.error(`${errors.length} packages failed validation. Exiting with error.`);
    process.exit(1);
  }
};

export async function verifyTestPackage(zipPath: string, logger?: ToolingLog | Logger) {
  const buffer = await readFileAsync(zipPath);
  try {
    const { packageInfo } = await generatePackageInfoFromArchiveBuffer(buffer, 'application/zip');
    logger?.info(`Successfully parsed zip pkg ${packageInfo.name}-${packageInfo.version}`);
  } catch (e) {
    logger?.error(`Error parsing ${zipPath} : ${e}`);
    throw e;
  }
}

export async function verifyTestPackageFromPath(
  packagePaths: string[],
  topLevelDir: string,
  logger?: ToolingLog | Logger
) {
  try {
    const packageInfo = await _generatePackageInfoFromPaths(packagePaths, topLevelDir);
    logger?.info(`Successfully parsed zip pkg ${packageInfo.name}-${packageInfo.version}`);
  } catch (e) {
    logger?.error(`Error parsing ${topLevelDir} : ${e}`);
    throw e;
  }
}

export function getAllTestPackagesZip() {
  return TEST_PACKAGE_DIRECTORIES.reduce((acc, dir) => {
    const packageVersionPaths = getAllPackagesFromDir(path.join(__dirname, dir));
    const [zips] = partition(packageVersionPaths, (p) => p.endsWith('.zip'));

    return [...acc, ...zips];
  }, [] as string[]);
}

export function getAllTestPackagesPaths() {
  return TEST_PACKAGE_DIRECTORIES.reduce((acc, dir) => {
    const packageVersionPaths = getAllPackagesFromDir(path.join(__dirname, dir));
    const [_, dirs] = partition(packageVersionPaths, (p) => p.endsWith('.zip'));

    const allPackageDirPaths = dirs.map(getAllPathsFromDir);
    return [
      ...acc,
      ...[...allPackageDirPaths.entries()].map(([i, paths]) => ({
        topLevelDir: packageVersionPaths[i],
        paths,
      })),
    ];
  }, [] as Array<{ topLevelDir: string; paths: string[] }>);
}

export const verifyAllTestPackages = async (
  logger?: ToolingLog | Logger
): Promise<{ successCount: number; errors: Error[] }> => {
  const errors = [];
  let successCount = 0;

  for (const zipPath of getAllTestPackagesZip()) {
    try {
      await verifyTestPackage(zipPath, logger);
      successCount++;
    } catch (e) {
      errors.push(e);
    }
  }

  for (const { topLevelDir, paths } of getAllTestPackagesPaths()) {
    try {
      await verifyTestPackageFromPath(paths, topLevelDir, logger);
      successCount++;
    } catch (e) {
      errors.push(e);
    }
  }

  return { successCount, errors };
};
