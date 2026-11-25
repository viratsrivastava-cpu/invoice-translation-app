namespace com.invoicetranslation;
using { cuid, managed } from '@sap/cds/common';

entity Translations : managed {
  key sourceKey : String(500);
  sourceText    : String(500);
  targetText    : String(500);
  origin        : String(10) default 'MANUAL';
}

entity TranslationLogs : cuid, managed {
  requestId : String(36);
  kind      : String(10);
  inputRef  : String(40);
  source    : String(20);
  dbMs      : Decimal(10,2);
  hubMs     : Decimal(10,2);
  status    : String(20);
  error     : String(200);
}
