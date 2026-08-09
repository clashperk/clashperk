import { drive as _drive } from '@googleapis/drive';
import { auth as _auth } from '@googleapis/oauth2';
import { sheets as _sheet, type sheets_v4 } from '@googleapis/sheets';
import { Util } from '../util/toolkit.js';

const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

const auth = new _auth.OAuth2({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET
});
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = _drive({ version: 'v3', auth });
const sheet = _sheet({ version: 'v4', auth });

const publish = async (fileId: string) => {
  return Promise.all([
    drive.permissions.create({
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      fileId
    }),
    drive.revisions.update({
      requestBody: {
        publishedOutsideDomain: true,
        publishAuto: true,
        published: true
      },
      revisionId: '1',
      fields: '*',
      fileId
    })
  ]);
};

export type SchemaRequest = sheets_v4.Schema$Request;

const allowedFormulas = ['=HYPERLINK(', '=IMAGE(', '=SUM('];

const getSheetValue = (value?: string | number | boolean | Date | null) => {
  if (typeof value === 'string' && allowedFormulas.some((formula) => value.startsWith(formula))) {
    return { formulaValue: value };
  }

  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { numberValue: value };
  if (typeof value === 'boolean') return { boolValue: value };
  if (value instanceof Date) return { numberValue: Util.dateToSerialDate(value) };
  return {};
};

const getUserEnteredFormat = (value?: string | number | boolean | Date | null) => {
  if (value instanceof Date) return { numberFormat: { type: 'DATE_TIME' } };
  if (typeof value === 'string' && allowedFormulas.some((formula) => value.startsWith(formula))) {
    return { hyperlinkDisplayType: 'LINKED' };
  }

  if (typeof value === 'number' && value % 1 !== 0) {
    return {
      numberFormat: {
        type: 'NUMBER',
        pattern: '0.00'
      }
    };
  }

  return {};
};

export const createHyperlink = (url: string, text: string) => `=HYPERLINK("${url}","${text}")`;

const getConditionalFormatRequests = (sheets: CreateGoogleSheet[]) => {
  const gridStyleRequests: SchemaRequest[] = sheets
    .map((sheet, sheetId) => [
      {
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [
              {
                sheetId,
                startRowIndex: 1,
                endRowIndex: sheet.rows.length + 1
              }
            ],
            booleanRule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [
                  {
                    userEnteredValue: '=MOD(ROW(),2)=0'
                  }
                ]
              },
              format: {
                backgroundColor: {
                  red: 1,
                  green: 1,
                  blue: 1
                }
              }
            }
          }
        }
      },
      {
        addConditionalFormatRule: {
          index: 1,
          rule: {
            ranges: [
              {
                sheetId,
                startRowIndex: 1,
                endRowIndex: sheet.rows.length + 1
              }
            ],
            booleanRule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [
                  {
                    userEnteredValue: '=MOD(ROW(),2)=1'
                  }
                ]
              },
              format: {
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9
                }
              }
            }
          }
        }
      }
    ])
    .flat();

  return gridStyleRequests;
};

const getStyleRequests = (sheets: CreateGoogleSheet[]) => {
  const styleRequests: SchemaRequest[] = sheets
    .map(({ columns }, sheetId) =>
      columns
        .map((column, columnIndex) => [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                // endRowIndex: 0,
                startColumnIndex: columnIndex,
                endColumnIndex: columnIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: column.align
                }
              },
              fields: 'userEnteredFormat(horizontalAlignment)'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                startIndex: columnIndex,
                endIndex: columnIndex + 1,
                dimension: 'COLUMNS'
              },
              properties: {
                pixelSize: column.width
              },
              fields: 'pixelSize'
            }
          }
        ])
        .flat()
    )
    .flat();

  return styleRequests;
};

const createSheetRequest = async (title: string, sheets: CreateGoogleSheet[]) => {
  const { data } = await sheet.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheets.map((sheet, sheetId) => ({
        properties: {
          sheetId,
          index: sheetId,
          title: Util.escapeSheetName(sheet.title),
          gridProperties: {
            rowCount: Math.max(sheet.rows.length + 1, 25),
            columnCount: Math.max(sheet.columns.length, 15),
            frozenRowCount: sheet.rows.length ? 1 : 0
          }
        }
      }))
    },
    fields: 'spreadsheetId,spreadsheetUrl'
  });
  return data;
};

const createColumnRequest = (columns: CreateGoogleSheet['columns']) => {
  return {
    values: columns.map((column) => ({
      userEnteredValue: {
        stringValue: column.name
      },
      userEnteredFormat: {
        wrapStrategy: 'WRAP',
        textFormat: { bold: true },
        verticalAlignment: 'MIDDLE'
      },
      note: column.note
    }))
  };
};

export const updateGoogleSheet = async (
  spreadsheetId: string,
  sheets: CreateGoogleSheet[],
  options: { clear: boolean; recreate: boolean; title: string }
) => {
  const replaceSheetRequests: SchemaRequest[] = [];

  if (options.recreate) {
    const {
      data: { sheets: oldSheets }
    } = await sheet.spreadsheets.get({ spreadsheetId });

    replaceSheetRequests.push(
      ...(oldSheets || []).slice(1).map((_, idx) => ({
        deleteSheet: { sheetId: idx + 1 }
      }))
    );

    replaceSheetRequests.push(
      ...sheets.slice(1).map((sheet, sheetId) => ({
        addSheet: {
          properties: {
            sheetId: sheetId + 1,
            title: Util.escapeSheetName(sheet.title),
            gridProperties: {
              rowCount: Math.max(sheet.rows.length + 1, 25),
              columnCount: Math.max(sheet.columns.length, 15),
              frozenRowCount: sheet.rows.length ? 1 : 0
            }
          }
        }
      }))
    );

    if (replaceSheetRequests.length) {
      await sheet.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [...replaceSheetRequests]
        }
      });
    }
  }

  const clearSheetRequests: SchemaRequest[] = sheets
    .map((sheet, sheetId) => [
      {
        updateCells: {
          range: {
            sheetId: sheetId
          },
          fields: 'userEnteredValue'
        }
      },
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            title: sheet.title,
            gridProperties: {
              columnCount: Math.max(sheet.columns.length, 15),
              rowCount: Math.max(sheet.rows.length + 1, 25),
              frozenRowCount: sheet.rows.length ? 1 : 0
            }
          },
          fields:
            'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount,title'
        }
      }
    ])
    .flat();

  const requests: SchemaRequest[] = sheets.map((sheet, sheetId) => ({
    updateCells: {
      start: {
        sheetId,
        rowIndex: 0,
        columnIndex: 0
      },
      rows: [
        createColumnRequest(sheet.columns),
        ...sheet.rows.map((values) => ({
          values: values.map((value) => ({
            userEnteredValue: getSheetValue(value),
            userEnteredFormat: getUserEnteredFormat(value)
          }))
        }))
      ],
      fields: '*'
    }
  }));

  await sheet.spreadsheets.batchUpdate(
    {
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSpreadsheetProperties: {
              properties: { title: options.title },
              fields: 'title'
            }
          },
          ...(options.clear ? clearSheetRequests : []),
          ...requests,
          ...getStyleRequests(sheets),
          ...getConditionalFormatRequests(sheets),
          {
            createDeveloperMetadata: {
              developerMetadata: {
                metadataKey: 'project',
                metadataValue: 'clashperk',
                visibility: 'DOCUMENT',
                location: {
                  spreadsheet: true
                }
              }
            }
          }
        ]
      }
    },
    { retry: true }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
};

export const createGoogleSheet = async (title: string, sheets: CreateGoogleSheet[]) => {
  const spreadsheet = await createSheetRequest(title, sheets);
  await Promise.all([
    updateGoogleSheet(spreadsheet.spreadsheetId!, sheets, { clear: false, recreate: false, title }),
    publish(spreadsheet.spreadsheetId!)
  ]);
  return {
    spreadsheetId: spreadsheet.spreadsheetId!,
    spreadsheetUrl: spreadsheet.spreadsheetUrl!
  };
};

const getLocation = async (query: string) => {
  const search = new URLSearchParams({
    address: query,
    key: process.env.GOOGLE_API_KEY!
  }).toString();

  return fetch(`${GOOGLE_MAPS_API_BASE_URL}/geocode/json?${search}`)
    .then(
      (res) =>
        res.json() as unknown as {
          results: {
            geometry: { location: { lat: string; lng: string } };
            formatted_address: string;
          }[];
        }
    )
    .catch(() => null);
};

const timezone = async (query: string) => {
  const location = (await getLocation(query))?.results[0];
  if (!location?.formatted_address) return null;

  const search = new URLSearchParams({
    key: process.env.GOOGLE_API_KEY!,
    timestamp: (new Date().getTime() / 1000).toString()
  }).toString();

  const lat = location.geometry.location.lat;
  const lng = location.geometry.location.lng;

  const timezone = await fetch(
    `${GOOGLE_MAPS_API_BASE_URL}/timezone/json?${search}&location=${lat},${lng}`
  )
    .then(
      (res) =>
        res.json() as unknown as {
          rawOffset: string;
          dstOffset: string;
          timeZoneName: string;
          timeZoneId: string;
        }
    )
    .catch(() => null);

  if (!timezone?.timeZoneId) return null;
  return { location, timezone };
};

export default {
  async location(query: string) {
    return getLocation(query);
  },

  async timezone(query: string) {
    return timezone(query);
  },

  sheet() {
    return sheet;
  },

  drive() {
    return drive;
  },

  async publish(fileId: string) {
    return publish(fileId);
  }
};

export interface CreateGoogleSheet {
  title: string;
  columns: { align: string; width: number; name: string; note?: string }[];
  rows: (string | number | Date | boolean | undefined | null)[][];
}
