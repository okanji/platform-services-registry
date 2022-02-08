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

import { URLSearchParams } from "url";
import axios from "axios";

const suscribeData = (contactId) => ({
  ContactId: contactId,
  SegmentsAndIds: [
    {
      segmentID: "5",
      segmentName: "Pathfinder SSO Segment",
      description:
        "This mailing list includes updates about major upcoming changes for the BC Gov's Pathfinder Single Sign On (SSO) Service (KeyCloak), important information for the product teams, and updates about SSO Service outages",
      isChecked: true,
    },
    {
      segmentID: "7",
      segmentName: "Platform Services team - test",
      description: "This is for testing your email before sending it!",
      isChecked: true,
    },
    {
      segmentID: "1",
      segmentName: "Platform Services Updates",
      description:
        "This mailing list includes updates about major upcoming changes on the Platform, important information for the product teams, and updates about Platform outages",
      isChecked: true,
    },
    {
      segmentID: "4",
      segmentName: "SSO Updates",
      description:
        "This mailing list includes updates about major upcoming changes for the BC Gov's Pathfinder Single Sign On (SSO) Service (KeyCloak), important information for the product teams, and updates about SSO Service outages",
      isChecked: true,
    },
    {
      segmentID: "6",
      segmentName: "SSO Updates Core Team",
      description:
        "This mailing list goes to the Pathfinder SSO core team&nbsp;",
      isChecked: true,
    },
  ],
});

export const getToken = async () => {
  const keycloakClientSecret =
    process.env.MAUTIC_SUBSSCRIPTION_API_CLIENT_SECRET;

  const params = {
    client_id: "mautic-subscription-api",
    client_secret: keycloakClientSecret,
    grant_type: "client_credentials",
  };

  const urlData = new URLSearchParams(params).toString();

  try {
    const { data } = await axios.post(
      "https://oidc.gov.bc.ca/auth/realms/devhub/protocol/openid-connect/token",
      urlData,
      {
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
        },
        withCredentials: true,
      }
    );

    return data.access_token;
  } catch (error) {
    console.log(error);
    return error.response;
  }
};

export const getContactId = async (email, token) => {
  try {
    const { data: segments } = await axios.get(
      "https://mautic-subscription-api-prod-de0974-prod.apps.silver.devops.gov.bc.ca/segments",
      {
        headers: {
          Email: email,
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `bearer ${token}`,
        },
      }
    );

    return segments.contactId;
  } catch (error) {
    console.log(error);
    return error.response;
  }
};

export const subscribeUsersToMesseges = async (contactId, token) => {
  try {
    const response = await axios.post(
      "https://mautic-subscription-api-prod-de0974-prod.apps.silver.devops.gov.bc.ca/segments/contact/add",
      suscribeData(contactId),
      {
        headers: {
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `bearer ${token}`,
        },
      }
    );

    return response;
  } catch (error) {
    return error.response;
  }
};
