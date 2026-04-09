import { App, Plugin, PluginSettingTab, Setting, TFile, ItemView, WorkspaceLeaf } from 'obsidian';

interface BirthdayPluginSettings {
  dateOfBirthProperty: string;
  daysToLookAhead: number;
}

const DEFAULT_SETTINGS: BirthdayPluginSettings = {
  dateOfBirthProperty: 'date-of-birth',
  daysToLookAhead: 30
}

interface Birthday {
  name: string;
  dateOfBirth: Date;
  nextBirthday: Date;
  daysUntil: number;
  age: number;
  file: TFile;
}

export default class BirthdayPlugin extends Plugin {
  settings: BirthdayPluginSettings;

  async onload() {
    await this.loadSettings();

    // Register the birthday view
    this.registerView(
      'birthday-view',
      (leaf) => new BirthdayView(leaf, this)
    );

    // Add command to open birthday view
    this.addCommand({
      id: 'open-birthday-view',
      name: 'Open birthday view',
      callback: () => {
        void this.activateView();
      }
    });

    // Add settings tab
    this.addSettingTab(new BirthdaySettingTab(this.app, this));
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType('birthday-view');

    if (leaves.length > 0) {
      // View already exists, use it
      leaf = leaves[0];
    } else {
      // Create new leaf in right sidebar
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: 'birthday-view', active: true });
      }
    }

    if (leaf) {
      void workspace.revealLeaf(leaf);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getBirthdays(): Birthday[] {
    const birthdays: Birthday[] = [];
    const files = this.app.vault.getMarkdownFiles();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;

      const dobValue = cache.frontmatter[this.settings.dateOfBirthProperty];
      if (!dobValue) continue;

      try {
        const { year: dobYear, month: dobMonth, day: dobDay } = this.parseDateParts(dobValue);
        if (dobYear === null) continue;

        // Calculate next birthday
        const nextBirthday = new Date(today.getFullYear(), dobMonth, dobDay);
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Only include if within the configured range
        if (daysUntil <= this.settings.daysToLookAhead) {
          const age = nextBirthday.getFullYear() - dobYear;

          birthdays.push({
            name: file.basename,
            dateOfBirth: new Date(dobYear, dobMonth, dobDay),
            nextBirthday,
            daysUntil,
            age,
            file
          });
        }
      } catch (error) {
        console.error(`Error parsing date for ${file.basename}:`, error);
      }
    }

    // Sort by days until birthday
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    return birthdays;
  }

  private parseDateParts(value: unknown): { year: number | null; month: number; day: number } {
    const nil = { year: null, month: 0, day: 0 };

    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return nil;
      return { year: parseInt(match[1]), month: parseInt(match[2]) - 1, day: parseInt(match[3]) };
    }

    if (value instanceof Date && !isNaN(value.getTime())) {
      return { year: value.getUTCFullYear(), month: value.getUTCMonth(), day: value.getUTCDate() };
    }

    return nil;
  }
}

class BirthdayView extends ItemView {
  plugin: BirthdayPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: BirthdayPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return 'birthday-view';
  }

  getDisplayText(): string {
    return 'Upcoming birthdays';
  }

  getIcon(): string {
    return 'cake';
  }

  onOpen(): Promise<void> {
    this.render();

    // Re-render when files are modified
    this.registerEvent(
      this.app.metadataCache.on('changed', () => {
        this.render();
      })
    );
    return Promise.resolve();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('birthday-view-container');

    // Add heading
    container.createEl('h4', {
      text: 'Upcoming birthdays',
      cls: 'birthday-heading'
    });

    const birthdays = this.plugin.getBirthdays();

    if (birthdays.length === 0) {
      container.createEl('p', {
        text: 'No upcoming birthdays found.',
        cls: 'birthday-empty'
      });
      return;
    }

    const list = container.createEl('div', { cls: 'birthday-list' });

    for (const birthday of birthdays) {
      const item = list.createEl('div', { cls: 'birthday-item' });

      const dateStr = birthday.nextBirthday.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit'
      });

      let datePrefix = '';
      let itemClass = 'birthday-later';

      if (birthday.daysUntil === 0) {
        datePrefix = '🎉 ';
        itemClass = 'birthday-today';
      } else if (birthday.daysUntil <= 7) {
        itemClass = 'birthday-soon';
      }

      item.addClass(itemClass);

      // Left side: Name and age
      const leftSide = item.createEl('div', { cls: 'birthday-left' });

      const nameEl = leftSide.createEl('a', {
        text: birthday.name,
        cls: 'birthday-name'
      });
      nameEl.addEventListener('click', (e) => {
        e.preventDefault();
        void this.app.workspace.getLeaf(false).openFile(birthday.file);
      });

      // Age (only show if in valid range)
      if (birthday.age >= 0 && birthday.age <= 120) {
        leftSide.createEl('span', {
          text: ` (${birthday.age})`,
          cls: 'birthday-age'
        });
      }

      // Right side: Date (monospace)
      item.createEl('span', {
        text: `${datePrefix}${dateStr}`,
        cls: 'birthday-date'
      });
    }
  }

  onClose(): Promise<void> {
    // Cleanup if needed
    return Promise.resolve();
  }
}

class BirthdaySettingTab extends PluginSettingTab {
  plugin: BirthdayPlugin;

  constructor(app: App, plugin: BirthdayPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Birthday plugin')
      .setHeading();

    new Setting(containerEl)
      .setName('Date of birth property')
      .setDesc('The frontmatter property name that contains the date of birth')
      .addText(text => text
        .setValue(this.plugin.settings.dateOfBirthProperty)
        .onChange(async (value) => {
          this.plugin.settings.dateOfBirthProperty = value || 'date-of-birth';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Days to look ahead')
      .setDesc('How many days in advance to show upcoming birthdays')
      .addText(text => text
        .setPlaceholder('30')
        .setValue(String(this.plugin.settings.daysToLookAhead))
        .onChange(async (value) => {
          const numValue = parseInt(value);
          if (!isNaN(numValue) && numValue > 0) {
            this.plugin.settings.daysToLookAhead = numValue;
            await this.plugin.saveSettings();
          }
        }));
  }
}
