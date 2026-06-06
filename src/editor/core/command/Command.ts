import { CommandAdapt } from './CommandAdapt'

// 通过CommandAdapt中转避免直接暴露编辑器上下文
export class Command {
  /** 对外暴露的mode命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeMode: CommandAdapt['mode']
  /** 对外暴露的cut命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeCut: CommandAdapt['cut']
  /** 对外暴露的copy命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeCopy: CommandAdapt['copy']
  /** 对外暴露的paste命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePaste: CommandAdapt['paste']
  /** 对外暴露的select all命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSelectAll: CommandAdapt['selectAll']
  /** 对外暴露的backspace命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeBackspace: CommandAdapt['backspace']
  /** 对外暴露的set range命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetRange: CommandAdapt['setRange']
  /** 对外暴露的replace range命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeReplaceRange: CommandAdapt['replaceRange']
  /** 对外暴露的set position context命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetPositionContext: CommandAdapt['setPositionContext']
  /** 对外暴露的force update命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeForceUpdate: CommandAdapt['forceUpdate']
  /** 对外暴露的blur命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeBlur: CommandAdapt['blur']
  /** 对外暴露的undo命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeUndo: CommandAdapt['undo']
  /** 对外暴露的redo命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRedo: CommandAdapt['redo']
  /** 对外暴露的disable history命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDisableHistory: CommandAdapt['disableHistory']
  /** 对外暴露的enable history命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeEnableHistory: CommandAdapt['enableHistory']
  /** 对外暴露的painter命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePainter: CommandAdapt['painter']
  /** 对外暴露的apply painter style命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeApplyPainterStyle: CommandAdapt['applyPainterStyle']
  /** 对外暴露的format命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeFormat: CommandAdapt['format']
  /** 对外暴露的font命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeFont: CommandAdapt['font']
  /** 对外暴露的size命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSize: CommandAdapt['size']
  /** 对外暴露的size add命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSizeAdd: CommandAdapt['sizeAdd']
  /** 对外暴露的size minus命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSizeMinus: CommandAdapt['sizeMinus']
  /** 对外暴露的bold命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeBold: CommandAdapt['bold']
  /** 对外暴露的italic命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeItalic: CommandAdapt['italic']
  /** 对外暴露的underline命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeUnderline: CommandAdapt['underline']
  /** 对外暴露的strikeout命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeStrikeout: CommandAdapt['strikeout']
  /** 对外暴露的superscript命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSuperscript: CommandAdapt['superscript']
  /** 对外暴露的subscript命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSubscript: CommandAdapt['subscript']
  /** 对外暴露的color命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeColor: CommandAdapt['color']
  /** 对外暴露的highlight命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeHighlight: CommandAdapt['highlight']
  /** 对外暴露的title命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTitle: CommandAdapt['title']
  /** 对外暴露的list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeList: CommandAdapt['list']
  /** 对外暴露的row flex命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowFlex: CommandAdapt['rowFlex']
  /** 对外暴露的row margin命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowMargin: CommandAdapt['rowMargin']
  /** 对外暴露的row columns命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowColumns: CommandAdapt['rowColumns']
  /** 对外暴露的row indent命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowIndent: CommandAdapt['rowIndent']
  /** 对外暴露的row indent left命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowIndentLeft: CommandAdapt['rowIndentLeft']
  /** 对外暴露的row indent right命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowIndentRight: CommandAdapt['rowIndentRight']
  /** 对外暴露的row hanging indent命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRowHangingIndent: CommandAdapt['rowHangingIndent']
  /** 对外暴露的set tab stops命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetTabStops: CommandAdapt['setTabStops']
  /** 对外暴露的set document styles命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetDocumentStyles: CommandAdapt['setDocumentStyles']
  /** 对外暴露的apply document style命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeApplyDocumentStyle: CommandAdapt['applyDocumentStyle']
  /** 对外暴露的clear document style命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeClearDocumentStyle: CommandAdapt['clearDocumentStyle']
  /** 对外暴露的page number continue命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageNumberContinue: CommandAdapt['pageNumberContinue']
  /** 对外暴露的page number restart命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageNumberRestart: CommandAdapt['pageNumberRestart']
  /** 对外暴露的page number range命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageNumberRange: CommandAdapt['pageNumberRange']
  /** 对外暴露的insert table命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTable: CommandAdapt['insertTable']
  /** 对外暴露的insert table top row命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTableTopRow: CommandAdapt['insertTableTopRow']
  /** 对外暴露的insert table bottom row命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTableBottomRow: CommandAdapt['insertTableBottomRow']
  /** 对外暴露的insert table left col命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTableLeftCol: CommandAdapt['insertTableLeftCol']
  /** 对外暴露的insert table right col命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTableRightCol: CommandAdapt['insertTableRightCol']
  /** 对外暴露的delete table row命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteTableRow: CommandAdapt['deleteTableRow']
  /** 对外暴露的delete table col命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteTableCol: CommandAdapt['deleteTableCol']
  /** 对外暴露的delete table命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteTable: CommandAdapt['deleteTable']
  /** 对外暴露的merge table cell命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeMergeTableCell: CommandAdapt['mergeTableCell']
  /** 对外暴露的cancel merge table cell命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeCancelMergeTableCell: CommandAdapt['cancelMergeTableCell']
  /** 对外暴露的split vertical table cell命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSplitVerticalTableCell: CommandAdapt['splitVerticalTableCell']
  /** 对外暴露的split horizontal table cell命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSplitHorizontalTableCell: CommandAdapt['splitHorizontalTableCell']
  /** 对外暴露的table td vertical align命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdVerticalAlign: CommandAdapt['tableTdVerticalAlign']
  /** 对外暴露的table border type命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableBorderType: CommandAdapt['tableBorderType']
  /** 对外暴露的table border color命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableBorderColor: CommandAdapt['tableBorderColor']
  /** 对外暴露的table border width命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableBorderWidth: CommandAdapt['tableBorderWidth']
  /** 对外暴露的table td border type命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdBorderType: CommandAdapt['tableTdBorderType']
  /** 对外暴露的table td border color命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdBorderColor: CommandAdapt['tableTdBorderColor']
  /** 对外暴露的table td border width命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdBorderWidth: CommandAdapt['tableTdBorderWidth']
  /** 对外暴露的table td slash type命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdSlashType: CommandAdapt['tableTdSlashType']
  /** 对外暴露的table td background color命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableTdBackgroundColor: CommandAdapt['tableTdBackgroundColor']
  /** 对外暴露的auto fit table命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeAutoFitTable: CommandAdapt['autoFitTable']
  /** 对外暴露的table select all命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTableSelectAll: CommandAdapt['tableSelectAll']
  /** 对外暴露的image命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeImage: CommandAdapt['image']
  /** 对外暴露的hyperlink命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeHyperlink: CommandAdapt['hyperlink']
  /** 对外暴露的delete hyperlink命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteHyperlink: CommandAdapt['deleteHyperlink']
  /** 对外暴露的cancel hyperlink命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeCancelHyperlink: CommandAdapt['cancelHyperlink']
  /** 对外暴露的edit hyperlink命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeEditHyperlink: CommandAdapt['editHyperlink']
  /** 对外暴露的separator命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSeparator: CommandAdapt['separator']
  /** 对外暴露的page break命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageBreak: CommandAdapt['pageBreak']
  /** 对外暴露的add watermark命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeAddWatermark: CommandAdapt['addWatermark']
  /** 对外暴露的delete watermark命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteWatermark: CommandAdapt['deleteWatermark']
  /** 对外暴露的search命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSearch: CommandAdapt['search']
  /** 对外暴露的search navigate pre命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSearchNavigatePre: CommandAdapt['searchNavigatePre']
  /** 对外暴露的search navigate next命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSearchNavigateNext: CommandAdapt['searchNavigateNext']
  /** 对外暴露的replace命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeReplace: CommandAdapt['replace']
  /** 对外暴露的print命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePrint: CommandAdapt['print']
  /** 对外暴露的replace image element命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeReplaceImageElement: CommandAdapt['replaceImageElement']
  /** 对外暴露的save as image element命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSaveAsImageElement: CommandAdapt['saveAsImageElement']
  /** 对外暴露的change image display命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeChangeImageDisplay: CommandAdapt['changeImageDisplay']
  /** 对外暴露的page mode命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageMode: CommandAdapt['pageMode']
  /** 对外暴露的page scale命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageScale: CommandAdapt['pageScale']
  /** 对外暴露的page scale recovery命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageScaleRecovery: CommandAdapt['pageScaleRecovery']
  /** 对外暴露的page scale minus命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageScaleMinus: CommandAdapt['pageScaleMinus']
  /** 对外暴露的page scale add命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePageScaleAdd: CommandAdapt['pageScaleAdd']
  /** 对外暴露的paper size命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePaperSize: CommandAdapt['paperSize']
  /** 对外暴露的paper direction命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executePaperDirection: CommandAdapt['paperDirection']
  /** 对外暴露的set paper margin命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetPaperMargin: CommandAdapt['setPaperMargin']
  /** 对外暴露的set main badge命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetMainBadge: CommandAdapt['setMainBadge']
  /** 对外暴露的set area badge命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetAreaBadge: CommandAdapt['setAreaBadge']
  /** 对外暴露的insert element list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertElementList: CommandAdapt['insertElementList']
  /** 对外暴露的insert area命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertArea: CommandAdapt['insertArea']
  /** 对外暴露的delete area命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteArea: CommandAdapt['deleteArea']
  /** 对外暴露的set area value命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetAreaValue: CommandAdapt['setAreaValue']
  /** 对外暴露的set area properties命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetAreaProperties: CommandAdapt['setAreaProperties']
  /** 对外暴露的location area命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLocationArea: CommandAdapt['locationArea']
  /** 对外暴露的append element list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeAppendElementList: CommandAdapt['appendElementList']
  /** 对外暴露的update element by id命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeUpdateElementById: CommandAdapt['updateElementById']
  /** 对外暴露的delete element by id命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteElementById: CommandAdapt['deleteElementById']
  /** 对外暴露的set value命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetValue: CommandAdapt['setValue']
  /** 对外暴露的remove control命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRemoveControl: CommandAdapt['removeControl']
  /** 对外暴露的translate命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeTranslate: CommandAdapt['translate']
  /** 对外暴露的set locale命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetLocale: CommandAdapt['setLocale']
  /** 对外暴露的location catalog命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLocationCatalog: CommandAdapt['locationCatalog']
  /** 对外暴露的标题定位命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLocationTitle: CommandAdapt['locationTitle']
  /** 对外暴露的word tool命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeWordTool: CommandAdapt['wordTool']
  /** 对外暴露的set html命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetHTML: CommandAdapt['setHTML']
  /** 对外暴露的set group命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetGroup: CommandAdapt['setGroup']
  /** 对外暴露的delete group命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeDeleteGroup: CommandAdapt['deleteGroup']
  /** 对外暴露的location group命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLocationGroup: CommandAdapt['locationGroup']
  /** 对外暴露的set zone命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetZone: CommandAdapt['setZone']
  /** 对外暴露的compute element list height命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeComputeElementListHeight: CommandAdapt['computeElementListHeight']
  /** 对外暴露的set control value命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlValue: CommandAdapt['setControlValue']
  /** 对外暴露的set control value list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlValueList: CommandAdapt['setControlValueList']
  /** 对外暴露的set control extension命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlExtension: CommandAdapt['setControlExtension']
  /** 对外暴露的set control extension list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlExtensionList: CommandAdapt['setControlExtensionList']
  /** 对外暴露的set control properties命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlProperties: CommandAdapt['setControlProperties']
  /** 对外暴露的set control properties list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlPropertiesList: CommandAdapt['setControlPropertiesList']
  /** 对外暴露的load control remote options命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLoadControlRemoteOptions: CommandAdapt['loadControlRemoteOptions']
  /** 对外暴露的load control remote options list命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLoadControlRemoteOptionsList: CommandAdapt['loadControlRemoteOptionsList']
  /** 对外暴露的set control highlight命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetControlHighlight: CommandAdapt['setControlHighlight']
  /** 对外暴露的validate control命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeValidateControl: CommandAdapt['validateControl']
  /** 对外暴露的validate control async命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeValidateControlAsync: CommandAdapt['validateControlAsync']
  /** 对外暴露的location control命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeLocationControl: CommandAdapt['locationControl']
  /** 对外暴露的insert control命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertControl: CommandAdapt['insertControl']
  /** 对外暴露的update options命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeUpdateOptions: CommandAdapt['updateOptions']
  /** 对外暴露的set track change命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeSetTrackChange: CommandAdapt['setTrackChange']
  /** 对外暴露的accept track change命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeAcceptTrackChange: CommandAdapt['acceptTrackChange']
  /** 对外暴露的reject track change命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRejectTrackChange: CommandAdapt['rejectTrackChange']
  /** 对外暴露的accept all track change命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeAcceptAllTrackChange: CommandAdapt['acceptAllTrackChange']
  /** 对外暴露的reject all track change命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeRejectAllTrackChange: CommandAdapt['rejectAllTrackChange']
  /** 对外暴露的insert title命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeInsertTitle: CommandAdapt['insertTitle']
  /** 对外暴露的focus命令入口，内部代理到 CommandAdapt 对应实现。 */
  public executeFocus: CommandAdapt['focus']
  /** 对外暴露的 catalog 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getCatalog: CommandAdapt['getCatalog']
  public getImage: CommandAdapt['getImage']
  /** 对外暴露的 options 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getOptions: CommandAdapt['getOptions']
  /** 对外暴露的 value 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getValue: CommandAdapt['getValue']
  /** 对外暴露的 OOXML package parts 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getOoxmlPackageParts: CommandAdapt['getOoxmlPackageParts']
  /** 对外暴露的 OOXML DOCX Blob 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getOoxmlDocxBlob: CommandAdapt['getOoxmlDocxBlob']
  /** 对外暴露的排版中间层快照查询入口。 */
  public getTypesettingLayoutSnapshot: CommandAdapt['getTypesettingLayoutSnapshot']
  /** 对外暴露的标题父子树查询入口。 */
  public getTitleTree: CommandAdapt['getTitleTree']
  /** 对外暴露的标题父子树节点查询入口。 */
  public getTitleTreeNode: CommandAdapt['getTitleTreeNode']
  /** 对外暴露的标题父子树节点批量查询入口。 */
  public getTitleTreeNodeList: CommandAdapt['getTitleTreeNodeList']
  /** 对外暴露的标题直接子节点查询入口。 */
  public getTitleTreeChildList: CommandAdapt['getTitleTreeChildList']
  /** 对外暴露的标题章节范围查询入口。 */
  public getTitleTreeRange: CommandAdapt['getTitleTreeRange']
  /** 对外暴露的公式符号库查询入口。 */
  public getFormulaSymbolList: CommandAdapt['getFormulaSymbolList']
  /** 对外暴露的文档样式库查询入口。 */
  public getDocumentStyles: CommandAdapt['getDocumentStyles']
  /** 对外暴露的结构化公式查询入口。 */
  public getFormulaById: CommandAdapt['getFormulaById']
  /** 对外暴露的 MathML 公式解析入口。 */
  public parseFormulaMathML: CommandAdapt['parseFormulaMathML']
  /** 对外暴露的 value async 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getValueAsync: CommandAdapt['getValueAsync']
  /** 对外暴露的 area value 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getAreaValue: CommandAdapt['getAreaValue']
  /** 对外暴露的 html 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getHTML: CommandAdapt['getHTML']
  /** 对外暴露的纯文本查询入口，内部代理到 CommandAdapt 实现。 */
  public getText: CommandAdapt['getText']
  public getWordCount: CommandAdapt['getWordCount']
  /** 对外暴露的 cursor position 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getCursorPosition: CommandAdapt['getCursorPosition']
  /** 对外暴露的 range 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getRange: CommandAdapt['getRange']
  /** 对外暴露的选区文本查询入口，内部代理到 CommandAdapt 实现。 */
  public getRangeText: CommandAdapt['getRangeText']
  /** 对外暴露的 range context 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getRangeContext: CommandAdapt['getRangeContext']
  /** 对外暴露的 range row 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getRangeRow: CommandAdapt['getRangeRow']
  /** 对外暴露的 range paragraph 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getRangeParagraph: CommandAdapt['getRangeParagraph']
  public getKeywordRangeList: CommandAdapt['getKeywordRangeList']
  /** 对外暴露的 keyword context 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getKeywordContext: CommandAdapt['getKeywordContext']
  /** 对外暴露的 paper margin 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getPaperMargin: CommandAdapt['getPaperMargin']
  /** 对外暴露的 search navigate info 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getSearchNavigateInfo: CommandAdapt['getSearchNavigateInfo']
  /** 对外暴露的语言标识查询入口，内部代理到 CommandAdapt 实现。 */
  public getLocale: CommandAdapt['getLocale']
  /** 对外暴露的 group ids 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getGroupIds: CommandAdapt['getGroupIds']
  public getGroupRectList: CommandAdapt['getGroupRectList']
  /** 对外暴露的 control value 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getControlValue: CommandAdapt['getControlValue']
  public getControlList: CommandAdapt['getControlList']
  public getContainer: CommandAdapt['getContainer']
  /** 对外暴露的 title value 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getTitleValue: CommandAdapt['getTitleValue']
  /** 对外暴露的 position context by event 查询入口，内部代理到 CommandAdapt 对应实现。 */
  public getPositionContextByEvent: CommandAdapt['getPositionContextByEvent']
  /** 对外暴露的元素 id 查询入口，内部代理到 CommandAdapt 实现。 */
  public getElementById: CommandAdapt['getElementById']
  public getTrackChangeList: CommandAdapt['getTrackChangeList']

  /** 初始化 Command 实例并注入运行依赖。 */
  constructor(adapt: CommandAdapt) {
    // 全局命令
    this.executeMode = adapt.mode.bind(adapt)
    this.executeCut = adapt.cut.bind(adapt)
    this.executeCopy = adapt.copy.bind(adapt)
    this.executePaste = adapt.paste.bind(adapt)
    this.executeSelectAll = adapt.selectAll.bind(adapt)
    this.executeBackspace = adapt.backspace.bind(adapt)
    this.executeSetRange = adapt.setRange.bind(adapt)
    this.executeReplaceRange = adapt.replaceRange.bind(adapt)
    this.executeSetPositionContext = adapt.setPositionContext.bind(adapt)
    this.executeForceUpdate = adapt.forceUpdate.bind(adapt)
    this.executeBlur = adapt.blur.bind(adapt)
    // 撤销、重做、格式刷、清除格式
    this.executeUndo = adapt.undo.bind(adapt)
    this.executeRedo = adapt.redo.bind(adapt)
    this.executeDisableHistory = adapt.disableHistory.bind(adapt)
    this.executeEnableHistory = adapt.enableHistory.bind(adapt)
    this.executePainter = adapt.painter.bind(adapt)
    this.executeApplyPainterStyle = adapt.applyPainterStyle.bind(adapt)
    this.executeFormat = adapt.format.bind(adapt)
    // 字体、字体大小、字体变大、字体变小、加粗、斜体、下划线、删除线、字体颜色、背景色
    this.executeFont = adapt.font.bind(adapt)
    this.executeSize = adapt.size.bind(adapt)
    this.executeSizeAdd = adapt.sizeAdd.bind(adapt)
    this.executeSizeMinus = adapt.sizeMinus.bind(adapt)
    this.executeBold = adapt.bold.bind(adapt)
    this.executeItalic = adapt.italic.bind(adapt)
    this.executeUnderline = adapt.underline.bind(adapt)
    this.executeStrikeout = adapt.strikeout.bind(adapt)
    this.executeSuperscript = adapt.superscript.bind(adapt)
    this.executeSubscript = adapt.subscript.bind(adapt)
    this.executeColor = adapt.color.bind(adapt)
    this.executeHighlight = adapt.highlight.bind(adapt)
    // 标题、对齐方式、列表
    this.executeTitle = adapt.title.bind(adapt)
    this.executeList = adapt.list.bind(adapt)
    this.executeRowFlex = adapt.rowFlex.bind(adapt)
    this.executeRowMargin = adapt.rowMargin.bind(adapt)
    this.executeRowColumns = adapt.rowColumns.bind(adapt)
    this.executeRowIndent = adapt.rowIndent.bind(adapt)
    this.executeRowIndentLeft = adapt.rowIndentLeft.bind(adapt)
    this.executeRowIndentRight = adapt.rowIndentRight.bind(adapt)
    this.executeRowHangingIndent = adapt.rowHangingIndent.bind(adapt)
    this.executeSetTabStops = adapt.setTabStops.bind(adapt)
    this.executeSetDocumentStyles = adapt.setDocumentStyles.bind(adapt)
    this.executeApplyDocumentStyle = adapt.applyDocumentStyle.bind(adapt)
    this.executeClearDocumentStyle = adapt.clearDocumentStyle.bind(adapt)
    this.executePageNumberContinue = adapt.pageNumberContinue.bind(adapt)
    this.executePageNumberRestart = adapt.pageNumberRestart.bind(adapt)
    this.executePageNumberRange = adapt.pageNumberRange.bind(adapt)
    // 表格、图片上传、超链接、搜索、打印、图片操作
    this.executeInsertTable = adapt.insertTable.bind(adapt)
    this.executeInsertTableTopRow = adapt.insertTableTopRow.bind(adapt)
    this.executeInsertTableBottomRow = adapt.insertTableBottomRow.bind(adapt)
    this.executeInsertTableLeftCol = adapt.insertTableLeftCol.bind(adapt)
    this.executeInsertTableRightCol = adapt.insertTableRightCol.bind(adapt)
    this.executeDeleteTableRow = adapt.deleteTableRow.bind(adapt)
    this.executeDeleteTableCol = adapt.deleteTableCol.bind(adapt)
    this.executeDeleteTable = adapt.deleteTable.bind(adapt)
    this.executeMergeTableCell = adapt.mergeTableCell.bind(adapt)
    this.executeCancelMergeTableCell = adapt.cancelMergeTableCell.bind(adapt)
    this.executeSplitVerticalTableCell =
      adapt.splitVerticalTableCell.bind(adapt)
    this.executeSplitHorizontalTableCell =
      adapt.splitHorizontalTableCell.bind(adapt)
    this.executeTableTdVerticalAlign = adapt.tableTdVerticalAlign.bind(adapt)
    this.executeTableBorderType = adapt.tableBorderType.bind(adapt)
    this.executeTableBorderColor = adapt.tableBorderColor.bind(adapt)
    this.executeTableBorderWidth = adapt.tableBorderWidth.bind(adapt)
    this.executeTableTdBorderType = adapt.tableTdBorderType.bind(adapt)
    this.executeTableTdBorderColor = adapt.tableTdBorderColor.bind(adapt)
    this.executeTableTdBorderWidth = adapt.tableTdBorderWidth.bind(adapt)
    this.executeTableTdSlashType = adapt.tableTdSlashType.bind(adapt)
    this.executeTableTdBackgroundColor =
      adapt.tableTdBackgroundColor.bind(adapt)
    this.executeAutoFitTable = adapt.autoFitTable.bind(adapt)
    this.executeTableSelectAll = adapt.tableSelectAll.bind(adapt)
    this.executeImage = adapt.image.bind(adapt)
    this.executeHyperlink = adapt.hyperlink.bind(adapt)
    this.executeDeleteHyperlink = adapt.deleteHyperlink.bind(adapt)
    this.executeCancelHyperlink = adapt.cancelHyperlink.bind(adapt)
    this.executeEditHyperlink = adapt.editHyperlink.bind(adapt)
    this.executeSeparator = adapt.separator.bind(adapt)
    this.executePageBreak = adapt.pageBreak.bind(adapt)
    this.executeAddWatermark = adapt.addWatermark.bind(adapt)
    this.executeDeleteWatermark = adapt.deleteWatermark.bind(adapt)
    this.executeSearch = adapt.search.bind(adapt)
    this.executeSearchNavigatePre = adapt.searchNavigatePre.bind(adapt)
    this.executeSearchNavigateNext = adapt.searchNavigateNext.bind(adapt)
    this.executeReplace = adapt.replace.bind(adapt)
    this.executePrint = adapt.print.bind(adapt)
    this.executeReplaceImageElement = adapt.replaceImageElement.bind(adapt)
    this.executeSaveAsImageElement = adapt.saveAsImageElement.bind(adapt)
    this.executeChangeImageDisplay = adapt.changeImageDisplay.bind(adapt)
    // 页面模式、页面缩放、纸张大小、纸张方向、页边距
    this.executePageMode = adapt.pageMode.bind(adapt)
    this.executePageScale = adapt.pageScale.bind(adapt)
    this.executePageScaleRecovery = adapt.pageScaleRecovery.bind(adapt)
    this.executePageScaleMinus = adapt.pageScaleMinus.bind(adapt)
    this.executePageScaleAdd = adapt.pageScaleAdd.bind(adapt)
    this.executePaperSize = adapt.paperSize.bind(adapt)
    this.executePaperDirection = adapt.paperDirection.bind(adapt)
    this.executeSetPaperMargin = adapt.setPaperMargin.bind(adapt)
    // 签章
    this.executeSetMainBadge = adapt.setMainBadge.bind(adapt)
    this.executeSetAreaBadge = adapt.setAreaBadge.bind(adapt)
    // 区域
    this.getAreaValue = adapt.getAreaValue.bind(adapt)
    this.executeInsertArea = adapt.insertArea.bind(adapt)
    this.executeDeleteArea = adapt.deleteArea.bind(adapt)
    this.executeSetAreaValue = adapt.setAreaValue.bind(adapt)
    this.executeSetAreaProperties = adapt.setAreaProperties.bind(adapt)
    this.executeLocationArea = adapt.locationArea.bind(adapt)
    // 通用
    this.executeInsertElementList = adapt.insertElementList.bind(adapt)
    this.executeAppendElementList = adapt.appendElementList.bind(adapt)
    this.executeUpdateElementById = adapt.updateElementById.bind(adapt)
    this.executeDeleteElementById = adapt.deleteElementById.bind(adapt)
    this.executeSetValue = adapt.setValue.bind(adapt)
    this.executeRemoveControl = adapt.removeControl.bind(adapt)
    this.executeTranslate = adapt.translate.bind(adapt)
    this.executeSetLocale = adapt.setLocale.bind(adapt)
    this.executeLocationCatalog = adapt.locationCatalog.bind(adapt)
    this.executeLocationTitle = adapt.locationTitle.bind(adapt)
    this.executeWordTool = adapt.wordTool.bind(adapt)
    this.executeSetHTML = adapt.setHTML.bind(adapt)
    this.executeSetGroup = adapt.setGroup.bind(adapt)
    this.executeDeleteGroup = adapt.deleteGroup.bind(adapt)
    this.executeLocationGroup = adapt.locationGroup.bind(adapt)
    this.executeSetZone = adapt.setZone.bind(adapt)
    this.executeComputeElementListHeight =
      adapt.computeElementListHeight.bind(adapt)
    this.executeUpdateOptions = adapt.updateOptions.bind(adapt)
    this.executeSetTrackChange = adapt.setTrackChange.bind(adapt)
    this.executeAcceptTrackChange = adapt.acceptTrackChange.bind(adapt)
    this.executeRejectTrackChange = adapt.rejectTrackChange.bind(adapt)
    this.executeAcceptAllTrackChange = adapt.acceptAllTrackChange.bind(adapt)
    this.executeRejectAllTrackChange = adapt.rejectAllTrackChange.bind(adapt)
    this.executeInsertTitle = adapt.insertTitle.bind(adapt)
    this.executeFocus = adapt.focus.bind(adapt)
    // 获取
    this.getImage = adapt.getImage.bind(adapt)
    this.getOptions = adapt.getOptions.bind(adapt)
    this.getValue = adapt.getValue.bind(adapt)
    this.getOoxmlPackageParts = adapt.getOoxmlPackageParts.bind(adapt)
    this.getOoxmlDocxBlob = adapt.getOoxmlDocxBlob.bind(adapt)
    this.getTypesettingLayoutSnapshot =
      adapt.getTypesettingLayoutSnapshot.bind(adapt)
    this.getTitleTree = adapt.getTitleTree.bind(adapt)
    this.getTitleTreeNode = adapt.getTitleTreeNode.bind(adapt)
    this.getTitleTreeNodeList = adapt.getTitleTreeNodeList.bind(adapt)
    this.getTitleTreeChildList = adapt.getTitleTreeChildList.bind(adapt)
    this.getTitleTreeRange = adapt.getTitleTreeRange.bind(adapt)
    this.getFormulaSymbolList = adapt.getFormulaSymbolList.bind(adapt)
    this.getDocumentStyles = adapt.getDocumentStyles.bind(adapt)
    this.getFormulaById = adapt.getFormulaById.bind(adapt)
    this.parseFormulaMathML = adapt.parseFormulaMathML.bind(adapt)
    this.getValueAsync = adapt.getValueAsync.bind(adapt)
    this.getHTML = adapt.getHTML.bind(adapt)
    this.getText = adapt.getText.bind(adapt)
    this.getWordCount = adapt.getWordCount.bind(adapt)
    this.getCursorPosition = adapt.getCursorPosition.bind(adapt)
    this.getRange = adapt.getRange.bind(adapt)
    this.getRangeText = adapt.getRangeText.bind(adapt)
    this.getRangeContext = adapt.getRangeContext.bind(adapt)
    this.getRangeRow = adapt.getRangeRow.bind(adapt)
    this.getRangeParagraph = adapt.getRangeParagraph.bind(adapt)
    this.getKeywordRangeList = adapt.getKeywordRangeList.bind(adapt)
    this.getKeywordContext = adapt.getKeywordContext.bind(adapt)
    this.getCatalog = adapt.getCatalog.bind(adapt)
    this.getPaperMargin = adapt.getPaperMargin.bind(adapt)
    this.getSearchNavigateInfo = adapt.getSearchNavigateInfo.bind(adapt)
    this.getLocale = adapt.getLocale.bind(adapt)
    this.getGroupIds = adapt.getGroupIds.bind(adapt)
    this.getGroupRectList = adapt.getGroupRectList.bind(adapt)
    this.getContainer = adapt.getContainer.bind(adapt)
    this.getTitleValue = adapt.getTitleValue.bind(adapt)
    this.getPositionContextByEvent = adapt.getPositionContextByEvent.bind(adapt)
    this.getElementById = adapt.getElementById.bind(adapt)
    this.getTrackChangeList = adapt.getTrackChangeList.bind(adapt)
    // 控件
    this.executeSetControlValue = adapt.setControlValue.bind(adapt)
    this.executeSetControlValueList = adapt.setControlValueList.bind(adapt)
    this.executeSetControlExtension = adapt.setControlExtension.bind(adapt)
    this.executeSetControlExtensionList =
      adapt.setControlExtensionList.bind(adapt)
    this.executeSetControlProperties = adapt.setControlProperties.bind(adapt)
    this.executeSetControlPropertiesList =
      adapt.setControlPropertiesList.bind(adapt)
    this.executeLoadControlRemoteOptions =
      adapt.loadControlRemoteOptions.bind(adapt)
    this.executeLoadControlRemoteOptionsList =
      adapt.loadControlRemoteOptionsList.bind(adapt)
    this.executeSetControlHighlight = adapt.setControlHighlight.bind(adapt)
    this.executeValidateControl = adapt.validateControl.bind(adapt)
    this.executeValidateControlAsync = adapt.validateControlAsync.bind(adapt)
    this.getControlValue = adapt.getControlValue.bind(adapt)
    this.getControlList = adapt.getControlList.bind(adapt)
    this.executeLocationControl = adapt.locationControl.bind(adapt)
    this.executeInsertControl = adapt.insertControl.bind(adapt)
  }
}
