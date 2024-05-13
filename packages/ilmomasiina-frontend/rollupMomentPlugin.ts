import { Plugin } from 'vite';

type Options = {
  timezone: string;
};

/** Removes unnecessary timezones from moment-timezone data files.
 *
 * Time zone data makes up a large portion of the bundle size if not filtered.
 *
 * The plugin leaves the following supported:
 * - The given timezone, with no aliases
 * - The UTC timezone with names "UTC" and "Etc/UTC"
 * - Data for countries using the given timezone
 */
export default function momentPlugin({ timezone }: Options): Plugin {
  return {
    name: 'momentPlugin',
    enforce: 'pre',
    transform(code, id) {
      // Don't do any processing to files other than the Moment.js timezone database.
      if (!id.endsWith('data/packed/latest.json')) return undefined;

      const original = JSON.parse(code);
      const trimmed = {
        ...original,
        // Zones is an array of strings like: "Continent/City|abbreviations|long string of data".
        // Filter to keep only the timezone named "Etc/UTC" and the given timezone.
        zones: original.zones.filter((zone: string) => zone.startsWith('Etc/UTC|') || zone.startsWith(`${timezone}|`)),
        // Links is an array of strings like: "Continent/City|Alias_Name".
        // Keep only the link named "UTC". (The full name is "Etc/UTC" in the DB, and we want "UTC" to work.)
        links: original.links.filter((link: string) => link.endsWith('|UTC')),
        // Countries is an array of strings like: "FI|Europe/Helsinki".
        // Keep countries that use the given timezone.
        countries: original.countries.filter((country: string) => country.includes(timezone)),
      };
      // Check that the given timezone actually exists in the database.
      if (!trimmed.zones.some((zone: string) => zone.startsWith(`${timezone}|`))) {
        return {
          errors: [{
            text: `Unable to find timezone ${timezone} in moment-timezone data file.`,
          }],
        };
      }
      return {
        code: JSON.stringify(trimmed),
        // Drop the source maps for the JSON file to avoid errors.
        map: { mappings: '' },
      };
    },
  };
}
