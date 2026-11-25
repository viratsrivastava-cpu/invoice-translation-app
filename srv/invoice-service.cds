using com.invoicetranslation as db from '../db/schema';

@path: '/invoice'
service InvoiceService {
  @readonly entity Translations    as projection on db.Translations;
  @readonly entity TranslationLogs as projection on db.TranslationLogs;

  type TranslationResult {
    text   : String;
    source : String;
    status : String;
    ms     : Decimal(10,2);
    error  : String;
  }

  type CompareResult {
    input        : String;
    database     : TranslationResult;
    hub          : TranslationResult;
    diffMs       : Decimal(10,2);
    savedPercent : Decimal(6,2);
  }

    type StoreResult {
    input    : String;
    database : TranslationResult;
    hub      : TranslationResult;
    saved    : Boolean;
    saveMs   : Decimal(10,2);
  }

  action translateAndSave(text : String) returns StoreResult;

  function lookupDb(text : String)     returns TranslationResult;
  function translateHub(text : String) returns TranslationResult;
  function compare(text : String)      returns CompareResult;
  action   addTranslation(sourceText : String, targetText : String) returns String;
}
