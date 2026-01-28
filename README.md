# 📏 Schuifmaat

[![License: MPL 2.0](https://img.shields.io/badge/license-MPL--2.0-informational)](https://github.com/digitalmethodsinitiative/schuifmaat/blob/main/LICENSE)

Schuifmaat is a browser extension that enables actual infinite scroll on X (fka Twitter)'s search result pages. When X 
refuses to load more posts, it will wait until more results are available (typically after 15 minutes), refresh the 
page, and resume scrolling. This way you can (given enough time) scroll through every single tweet for a given user, 
hashtag, or other type of search query.

This is especially useful when used in combination with 
[Zeeschuimer](https://github.com/digitalmethodsinitiative/zeeschuimer/), to collect post metadata.

## Installation
Schuifmaat is in sporadic development. .xpi files that you can use to install it in your browser are available on the
[releases](https://github.com/digitalmethodsinitiative/schuifmaat/releases) page. These are signed and can be installed
in any Firefox-based browser. If you want to run the latest development version instead, you can [do so from the Firefox
debugging console](https://www.youtube.com/watch?v=J7el77F1ckg) after cloning the repository locally.

## How to use
Install the browser extension in a Firefox browser. A button with the Schuifmaat logo (three downwards arrows) will 
appear in the browser toolbar. Click it to open the Schuifmaat interface. The 'Start' button is available when viewing
an [X search results page](https://x.com/search?q=wholesome&src=typed_query&f=live). Click it to start scrolling.

By default, X shows 'Top' search results in some sort of algorithmic order. It is recommended to instead sort by 
'Latest' to get more consistent results.

Schuifmaat will keep scrolling the page even when the tab is not in focus (i.e. you can browse in other tabs while 
things are scrolling) but browsers may de-prioritise or even unload tabs that are not in focus, so it is recommended to 
keep the relevant tab open and active for better results. 

The icon of the extension is red when scrolling in the currently active tab, yellow when scrolling in another tab, and 
black when not currently scrolling.

## Credits & license
Zoekplaatje was developed by Stijn Peeters for the [Digital Methods Initiative](https://digitalmethods.net) and is
licensed under the Mozilla Public License, 2.0. Refer to the LICENSE file for more information. It is inspired by and 
uses elements of [FoxScroller](https://addons.mozilla.org/en-US/firefox/addon/foxscroller/) and 
[Twitter-Deleter](https://addons.mozilla.org/en-US/firefox/addon/twitter-deleter/)

Interface background pattern by [Travis Beckham](https://travisbeckham.com/). Interface icons by
[Font Awesome](https://fontawesome.com/license/free). [Vampiro One](https://fonts.google.com/specimen/Vampiro+One)
font from Google Fonts.
