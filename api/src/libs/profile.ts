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
//

import { logger } from "@bcgov/common-nodejs-utils";
import { isEqual } from "lodash";
import DataManager from "../db";
import { Cluster } from "../db/model/cluster";
import { NameSpacesQuotaSize, ProjectNamespace } from "../db/model/namespace";
import { ProjectProfile } from "../db/model/profile";
import { ProjectQuotaSize, NamespaceQuotaSize } from "../db/model/quota";
import { compareNameSpaceQuotaSize } from "../db/utils";
import shared from "./shared";

const dm = new DataManager(shared.pgPool);
const { NamespaceModel, ClusterModel, ProfileModel, ContactModel } = dm;

export const getClusters = async (
  profile: ProjectProfile
): Promise<Cluster[]> => {
  try {
    if (!profile.id) {
      throw new Error("Cant get profile id");
    }
    const namespaces: ProjectNamespace[] = await NamespaceModel.findForProfile(
      profile.id
    );
    if (!namespaces) {
      throw new Error("Unable to find namespaces");
    }

    const promises: Promise<Cluster>[] = [];

    if (namespaces.length !== 0) {
      // clusters field is not natively from NamespaceModel but results from findForProfile
      const { clusters } = namespaces[0];

      clusters?.map((cluster) => {
        promises.push(ClusterModel.findById(cluster.clusterId));
      });
    }

    return await Promise.all(promises);
  } catch (err) {
    const message = "Unable to get all clusters for the profile";
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};

export const getProvisionStatus = async (
  profile: ProjectProfile
): Promise<boolean> => {
  try {
    const clusters = await getClusters(profile);
    for (const cluster of clusters) {
      const isClusterProvisioned =
        await NamespaceModel.getProjectSetProvisionStatus(
          Number(profile.id),
          Number(cluster.id)
        );

      if (!isClusterProvisioned) {
        return false;
      }
    }

    return true;
  } catch (err) {
    const message = `Unable to determine if profile ${profile.id} is provisioned`;
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};

export const updateProvisionStatus = async (
  profile: ProjectProfile,
  clusterName: string,
  provisionStatus: boolean
): Promise<void> => {
  try {
    const cluster: Cluster = await ClusterModel.findByName(clusterName);
    if (!cluster.id || !profile.id) {
      throw new Error("Unable to get primary cluster id or profile id");
    }

    await NamespaceModel.updateProjectSetProvisionStatus(
      profile.id,
      cluster.id,
      provisionStatus
    );
  } catch (err) {
    const message = `Unable to update provisioned profile ${profile.id}`;
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};

export const updateProfileStatus = async (
  profileId: number,
  profileStatus: string
): Promise<void> => {
  try {
    await ProfileModel.updateProfileStatus(profileId, profileStatus);
  } catch (err) {
    const message = `Unable to update profile ${profileId} status`;
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};

// This function is now not been used, but keep it here because this is used to validate if the request quota size is allowed
// In current desicion, we allowed user to select any quota size.
export const getNamespaceQuotaSize = async (
  profile: ProjectProfile,
  namespace: string
): Promise<NamespaceQuotaSize> => {
  try {
    const profileNamespaceQuotaSizesInAllCluster: NamespaceQuotaSize[] =
      await NamespaceModel.getProfileNamespaceQuotaSize(profile.id, namespace);

    let hasSameQuotaSizesForAllClusters: boolean = false;

    if (profileNamespaceQuotaSizesInAllCluster.length === 1) {
      hasSameQuotaSizesForAllClusters = true;
    } else {
      const namespaceQuotaSizesForAllClusters: NameSpacesQuotaSize = {
        quotaCpuSize: [],
        quotaMemorySize: [],
        quotaStorageSize: [],
        quotaSnapshotSize: [],
      };
      const QuotaSizeObjectKey = Object.keys(namespaceQuotaSizesForAllClusters);
      /**
       * following line is to push all quota info from array of object into a single object
       *  that can be consumed by compareNameSpaceQuotaSize to compare if quota size are the same
       * across all cluster.
       */
      profileNamespaceQuotaSizesInAllCluster.forEach((element) => {
        QuotaSizeObjectKey.forEach((key) => {
          namespaceQuotaSizesForAllClusters[key].push(element[key]);
        });
      });
      hasSameQuotaSizesForAllClusters = compareNameSpaceQuotaSize(
        namespaceQuotaSizesForAllClusters
      );
    }

    if (hasSameQuotaSizesForAllClusters) {
      // because we checked if all element in profileQuotaSizes are the same, so we can just return any of the element
      return profileNamespaceQuotaSizesInAllCluster[0];
    }
    throw new Error(`Need to fix entries as the quota size of cluster namespaces
      under the profile is not consistent`);
  } catch (err) {
    const message = `Unable to get namespace quota size for profile ${profile.id}`;
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};

export const getQuotaSize = async (
  profile: ProjectProfile
): Promise<ProjectQuotaSize> => {
  try {
    const clusters: Cluster[] = await getClusters(profile);
    const promises: any = [];
    clusters.forEach((cluster: Cluster) => {
      if (!profile.id || !cluster.id) {
        throw new Error("Unable to get profile id or cluster id");
      }
      promises.push(
        NamespaceModel.getProjectSetQuotaSize(profile.id, cluster.id)
      );
    });
    // Some profile may have two clusters, which has eight namespace
    const profileQuotaSizes: ProjectQuotaSize[] = await Promise.all(promises);
    let hasSameQuotaSizesForAllClusters: boolean = false;
    // profileQuotaSizes is an array [{ quotaCpuSize: 'small', quotaMemorySize: 'small', quotaStorageSize: 'small', quotaSnapshotSize: 'small' }]
    if (profileQuotaSizes.length === 1) {
      hasSameQuotaSizesForAllClusters = true;
    } else {
      const quotaSizesForAllClusters: NameSpacesQuotaSize = {
        quotaCpuSize: [],
        quotaMemorySize: [],
        quotaStorageSize: [],
        quotaSnapshotSize: [],
      };
      /**
       * following line is to push all quota info from array of object into a single object
       *  that can be consumed by compareNameSpaceQuotaSize to compare if quota size are the same
       * across all cluster.
       */
      hasSameQuotaSizesForAllClusters = profileQuotaSizes.every((element) =>
        isEqual(element, profileQuotaSizes[0])
      );

      hasSameQuotaSizesForAllClusters = compareNameSpaceQuotaSize(
        quotaSizesForAllClusters
      );
    }
    if (hasSameQuotaSizesForAllClusters) {
      // because we checked if all element in profileQuotaSizes are the same, so we can just return any of the element
      return profileQuotaSizes[0];
    }
    throw new Error(`Need to fix entries as the quota size of cluster namespaces
     under the profile is not consistent`);
  } catch (err) {
    const message = `Unable to get quota size for profile ${profile.id}`;
    logger.error(`${message}, err = ${err.message}`);
    throw err;
  }
};
// update project wide quota size function was removed in https://github.com/bcgov/platform-services-registry/pull/573/files

export const archiveProjectSet = async (profileId: number): Promise<void> => {
  try {
    // Step 1. Archive Contacts
    const contacts = await ContactModel.findForProject(profileId);

    for (const contact of contacts) {
      await ContactModel.delete(Number(contact.id));
    }

    // Step 2. Archive Namespace
    const projectNamespaces = await NamespaceModel.findForProfile(profileId);

    for (const namespace of projectNamespaces) {
      // @ts-ignore
      await NamespaceModel.delete(Number(namespace.namespaceId));
    }

    // Step 3. Archive profile
    await ProfileModel.delete(profileId);
  } catch (err) {
    const message = `Unable to archive project set with profile id ${profileId}`;
    logger.error(`${message}, err = ${err.message}`);

    throw err;
  }
};
