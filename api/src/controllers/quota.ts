//
// Copyright © 2020 Province of British Columbia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { errorWithCode, logger } from "@bcgov/common-nodejs-utils";
import { Request, Response } from "express";
import DataManager from "../db";
import shared from "../libs/shared";
import { NameSpacesQuotaSize } from "../db/model/namespace";
import { QuotaSizeQueryRef } from "../db/model/quota";

const dm = new DataManager(shared.pgPool);

export const fetchQuota = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { QuotaModel } = dm;
    const results = await QuotaModel.findQuota();
    res.status(200).json(results);
  } catch (err) {
    const message = `Unable fetch quotas`;
    logger.error(`${message}, err = ${err.message}`);

    throw errorWithCode(message, 500);
  }
};

export const fetchQuotaSizes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { QuotaModel } = dm;
    const quotaSizes = await QuotaModel.findQuotaSizes();
    res.status(200).json(quotaSizes);
  } catch (err) {
    const message = `Unable to get quota sizes`;
    logger.error(`${message}, err = ${err.message}`);

    throw errorWithCode(message, 500);
  }
};

export const getAllAllowedQuotaSize = async (req: Request, res: Response) => {
  try {
    const { QuotaModel } = dm;
    const allAvailableQuotaSize: NameSpacesQuotaSize = {
      quotaCpuSize:
        (await QuotaModel.getAllQuotaRef(QuotaSizeQueryRef.CPUQuery)) || [],
      quotaMemorySize:
        (await QuotaModel.getAllQuotaRef(QuotaSizeQueryRef.MemoryQuery)) || [],
      quotaStorageSize:
        (await QuotaModel.getAllQuotaRef(QuotaSizeQueryRef.StorageQuery)) || [],
      quotaSnapshotSize:
        (await QuotaModel.getAllQuotaRef(QuotaSizeQueryRef.SnapshotQuery)) ||
        [],
    };
    res.status(200).json(allAvailableQuotaSize);
  } catch (err) {
    const message = `Unable to get all quota sizes name.`;
    logger.error(`${message}, err = ${err.message}`);

    throw errorWithCode(message, 500);
  }
};
