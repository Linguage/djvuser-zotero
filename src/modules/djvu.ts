import { config } from "../../package.json";

declare const Zotero: any;
declare const ztoolkit: any;

export class DjVuReader {
  private static async getDjVuAttachment(item: any) {
    let attachment = item;

    if (!attachment.isAttachment || !attachment.isAttachment()) {
      const mainItem = attachment;
      const attachmentIDs = mainItem.getAttachments
        ? mainItem.getAttachments(false)
        : [];

      const attachments = attachmentIDs
        .map((id: number) => Zotero.Items.get(id))
        .filter((att: any) => att && att.isAttachment && att.isAttachment());

      for (const att of attachments) {
        const attPath = await att.getFilePathAsync();
        if (attPath && attPath.toLowerCase().endsWith(".djvu")) {
          return att;
        }
      }
      return null;
    }

    const path = await attachment.getFilePathAsync();
    if (!path || !path.toLowerCase().endsWith(".djvu")) {
      return null;
    }
    return attachment;
  }

  static async open(item: any) {
    const attachment = await DjVuReader.getDjVuAttachment(item);

    if (!attachment) {
      new ztoolkit.ProgressWindow("DjVu Reader")
        .createLine({
          text: "没有找到 .djvu 附件。",
          type: "error",
        })
        .show();
      return;
    }

    const path = await attachment.getFilePathAsync();
    const viewerUrl = `chrome://${config.addonRef}/content/djvujs/index.html`;
    const fileUrl = "file://" + path;
    const fullUrl = `${viewerUrl}?url=${encodeURIComponent(fileUrl)}`;

    const mainWindow = Zotero.getMainWindow();

    // 只使用一个较大的独立窗口打开 DjVu 阅读器，避免干扰 Zotero 内部 Tab 状态
    mainWindow.openDialog(
      fullUrl,
      "djvu-reader",
      "chrome,centerscreen,resizable,width=1200,height=800",
    );
  }

  static async openInBrowser(item: any) {
    const attachment = await DjVuReader.getDjVuAttachment(item);

    if (!attachment) {
      new ztoolkit.ProgressWindow("DjVu Reader")
        .createLine({
          text: "没有找到 .djvu 附件。",
          type: "error",
        })
        .show();
      return;
    }

    const path = await attachment.getFilePathAsync();
    const fileUrl = "file://" + path;
    
    // Open in system default browser/application
    Zotero.launchURL(fileUrl);
  }

  static registerRightClickMenuItem() {
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "djvu-reader-open",
      label: "Open with DjVu Reader",
      commandListener: async (ev: any) => {
        const items = Zotero.getMainWindow().ZoteroPane.getSelectedItems();
        if (items.length !== 1) return;
        await DjVuReader.open(items[0]);
      },
      // Using the default icon for now
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    });

    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "djvu-reader-open-browser",
      label: "Open in Browser",
      commandListener: async (ev: any) => {
        const items = Zotero.getMainWindow().ZoteroPane.getSelectedItems();
        if (items.length !== 1) return;
        await DjVuReader.openInBrowser(items[0]);
      },
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`, 
    });
  }
}
