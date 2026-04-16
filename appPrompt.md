  I am building a visualization chart application  whose aim is to be able to simulate volume of products sold

  The chart application will be of Forex chart type where we will support the following 3 types of charts :
    1. Bar charts (just simple vertical lines of fixed stroke)
    2. candlestick (not the traditional candlesticks, in this case the candle body will signify the volume depletion in that hour but the maximum volume that can be depleted per hour is already preset,also the the wicks will not play so much of a role because the volume of products sold at a given price that hour is the only thing that matters. So for example : if the maximum volume that can be depleted is 100 units and the price for that hour is 20rs, and the volume of products sold at that hour is 50 units, then the candle body will be of height 50 units and the wick will not be shown by default but if the wick settings are enabled then the wick will be shown by default which will now show the volume of products that could have been sold at that hour if the maximum volume was reached, so in this case the wick will be of height 50 units too)
    3. Line chart (this will just be a simple line chart that will show the volume of products sold at each hour)
  The chart and the data will be based on a given selected category from a list of N categories. the volume depletion of these categories will be simulated based on a number of preset parameters which will be adjustible by the user from a settings page.


  The parameters are as follows:
    1. Day Hours (this will be for how long the simulation will run, i.e. how many hours the simulation will run for. It can take only 2 values : Daylight - 8 working hours, from 9am to 5pm (we can also adjust the daylight hours) and  24H - the full day. By default , the value is set to Daylight)
    2. Rate of Depletion (it will basically be max volume per hour. So if the rate is 60/hr = 1 unit per minute = 1 unit per 60 seconds. The value is custom and can be any number)
    3. starting Daily volume : this is the number of products that will start the day, it can be any number from 0 to any number.By default it is 0. So every day will start from 0 units of products in the first second at the begining of each day . So if we are on a Daylight setting on the first second the volume will be 0 and it will start depleting (or sold) from there. (This parameter will either be : Custom -where the default is 0 and the user can set it to any number, or it can be set to continous - where the volume will not reset to 0 at the begining of each day but will continue from where it left off the previous day. By default , the value is set to Custom)
    4. volume variation : This раrameter will be either Hourly -( where the volume at every hour of the operating Day Hours can be set. for example : 9am - 10am : 10 units, 10am - 11am : 20 units, 11am - 12pm : 30 units, 12pm - 1pm : 40 units, 1pm - 2pm : 50 units, 2pm - 3pm : 60units, 3pm - 4pm : 70 units, 4pm - 5pm : 80 units). or Continous- (where the volume will be depleted based on the rate of depletion set in the rate of depletion parameter. By default , the value is set to Continuous).
    5.  price variation : This parameter will be either Hourly -( where the price at every hour of the operating Day Hours can be set. for example : 9am - 10am : 10 currency, 10am - 11am : 20 currency, 11am - 12pm : 30 currency, 12pm - 1pm : 40 currency, 1pm - 2pm : 50 currency, 2pm - 3pm : 60 currency, 3pm - 4pm : 70 currency, 4pm - 5pm : 80 currency. In such a case therefore, 10 currency units/hr = 0.1667 currency units/minute = 0.002778 currency units/second). or Continous- (where the price will change based on the folowing 2 sub parameters : starting Price /day and ending Price /day. By default , the value is set to Continous and both these 2 sub parameters will be customisable by the user.)

    6.V to V Relation: This parameter will matter only to the affect the rendering of the candlestick chart .It can take 2 values - None ( where all the candlesticks look same with unique color) or Display( where it will have two sub values : Progressive - where the current candle is is at a higher price than the previous one. So the volume in this hour is at a higher price than the previous hour, we attribute a color for this candle . By default the color is green but the user can change this setting. Regressive - where the current candle is is at a lower price than the previous one. So the volume in this hour is at a lower price than the previous hour, we attribute a color for this candle . By default the color is red but the user can change this setting. )

    7. Variation Pattern: This setting can be either on or off . By default it is Off.(The variation pattern will help us add some degree of controlled of change ,maybe following a given known function or a random distribution(But this must be explained first and allowed for me to validate it)to the volume and price variation points so that we have a smooth real life simulation of shaky volume and price changes but ultimately end up producing the same preset value. 
    So for example the volume is set to 60 units/hour and the price to 10 currency/hour ,in that hour. this variation will ensure that the minute by minute volume and price changes are not linear but are rather random but the total volume and price at the end of the hour is 60 units and 10 currency respectively.
    If the variation pattern is off, then the minute by minute volume and price changes will be linear. 
    ) 

Now all the above parameters will be perculiar per category of product. So from the settings page the user can select a category then apply the parameters to that category.  The user can also save these parameters as a preset for that category.(But will be done later- the function should be there but inactive and grayed out for now )  

## Access Control. 
The Chart page will be accessible to all users. infact its the landing page.
The Settings page on the other hand will be accessible only to admins. But for now, it should accessible on a separate /settings route which is not linked to from the Chart page. So it will accessible by modifying the url



## UI Design
The will take on after the design in this same folder @image.png BUT with the following changes :
  1. The top bar section containing the logo should not have the search icon and the circular overlapping images with the text that says 12 to 15 on work. The only 2 components on that top bar should be the Logo any representation is fine, even a text will do and the user profile component which will show the user's name and profile picture. (The user profile component will be on the top right corner of the top bar)
  2.  the left vertical bar should have the following icons from top to bottom:
    - Chart icon (this will be the active icon since the chart page is the landing page)
    - Chart Settings icon (this will take the user to the chart settings page but will be inactive and grayed out for now. This is where things like colors of the bar charts and the wick allowed for candlestick charts are selected)
    - Settings icon (this will take the user to the settings page but will be inactive and grayed out for now)
    - FullScreen icon (this will be active and will toggle the full screen mode of the chart page. Showing only the chart and the top bar)
  3. The main body of the page.
      - The Heading text that Says "Statistics" should be left as is.
      - The section saying  Days Weeks Months should be changed to show the time frames Hours, Minutes, Seconds
      - The section beneath that Statistics and the time frames should be removed entirely. 
      - Finally the chart should be displayed in the main body of the page. 
      -Everything beneath the chart should be removed entirely for now.
  4. The right vertical bar will have the following Components from top to bottom:
    - The first title that says"Starting calls" should now say "Active"
    - The section beneath should have a list of all the active categories rendered with the component containing an image which is a profile image now be a category-icon-image and the text next to it should be the category name. If no categories have been made active yet the entire section including its Active heading text should be collapsed. Into an accordion type component with the Active heading text as the header. 
    -The Next Section with the title "Break" Should now say "All Categories". Also rendered as an accordion type component with the All Categories heading text as the header. Which is expanded by default. Should have the following components
     - A search bar to search through the categories
     - A list of all the categories rendered with the component containing an image which is a profile image now be a category-icon-image and the text next to it should be the category name.  If no categories are present then a no data component shuld be rendered.Same scenario if a search is not found.
