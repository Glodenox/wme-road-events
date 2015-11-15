# Road Events Data

This userscript augments the [Waze Map Editor](https://www.waze.com/editor/) by providing a means to search for any nearby reported road events. If you get a User Request mentioning road works it might be possible to find which event they are referring to without ever having to leave WME.
__Note: the script is still under development and not too many sources have been added so far. This can be expanded quite easily though.__

### Current data sources

- GIPOD (Flanders, Belgium)

## Installation instructions

> TL;DR: install as most other WME userscripts from its [Greasy Fork page](https://greasyfork.org/nl/scripts/13316-wme-road-events-data)

Userscripts are snippets of code that are executed after the loading of certain webpages. This script does this after the loading of the Waze Map Editor. In order to run userscripts in your browser, you are adviced to use Firefox or Google Chrome.

You will need to install an add-on that manages userscripts for this to work. If you use Firefox, you should install [GreaseMonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) and for Google Chrome you should install [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).

These add-ons will be visible in the browser with an additional button that is visible to the right of the address bar. Through this button it will be possible to maintain any userscripts you install.

For Road Events Data, you should be able to install the script at [Greasy Fork](https://greasyfork.org/nl/scripts/13316-wme-road-events-data). There will be a big green install button which you will have to press to install the script.
__When installing userscripts always pay attention to the site(s) on which the script runs.__ This script only runs on Waze.com, so other sites will not be affected in any way.

After installing a userscript, you will be able to find it working on the site(s) specified. Do note that if you had the page open before installing the userscript, you will first need to refresh the page.

GreaseMonkey and TamperMonkey will occasionally check for new versions of these scripts. You will get a notification when a new version has been found and installed.

## How to use

The script presents itself with a new tab in the left sidebar named "RED" (Road Events Data). Clicking this tab yields the Search current location button with which you can search the current map view for any known road events.
As searching these data sources can be a very intensive job for the sources, this process hasn't been made automatic whenever you browse the map.

![Road Events Data tab](https://tomputtemans.com/waze-scripts/images/RED-1.png)

After clicking the button the script will search for any road events. This can result in either a list of results, a message that no data was found for the visible area or that no data sources are configured for the current area. 

The results returned by the script are sorted by importance first and then on starting date in ascending order.

![Road Events Data result list](https://tomputtemans.com/waze-scripts/images/RED-2.png)

These results are also shown on the map with markers. The numbers in these markers corresponds with the numbers in the results list, as do the colours in the background. At the moment it is not yet possible to click on these markers to retrieve the event details, this is a known issue.

![Road Events Data map markers](https://tomputtemans.com/waze-scripts/images/RED-3.jpg)

A click on an item in the results list brings up the detail page of that specific event. Any information provided by the data source will be listed here, along with any references provided by the source. The map will also zoom in on the event.

The "Back to results" button can be used to return to the results list.

![Road Events Data detail list](https://tomputtemans.com/waze-scripts/images/RED-4.png)

## Feedback and suggestions

Any issues found can be reported at the [GitHub project page](https://github.com/Glodenox/wme-gipod/issues). A forum thread will be made later when more sources are added. At this moment I am not yet looking into new data sources, but feel free to list any that you know of. These sources should contain geographic references pointing to the location of the event. Also note that this information needs to be open data, so free to use for any purpose.