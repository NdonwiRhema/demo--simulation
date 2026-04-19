-------- Update Version 2.0 --------

# Modification to the number Pages.
1. There will now be a total number of 4 pages. (Settings, Chart - which will be a simple presentation of the chart as it is described below, preview page which will hold the current chart page as it is currently only with the modifications mentioned in the subsequent section below, a login page which will give access to the different pages as outlined below as well. ).

# Login Page - 
- The Login Page will be a simple login page having the form right at the center of the screen . The login form must be customized to hold a logo image above the Form 
- The Login Form will have two input fields ( Email and Password) and a login button ,
 ## Access to the Pages 
  The Login will have 2 sets of separate login credentials , one will be Admin credential which gives access to all the pages and an user credential which will give limited access to the application specifically only the presentation page that is the Chart page. 
  ## Admin User Credentials 
  Email: [rhey@high.com]
  Password: [123456789]
  ## User Credentials
  Email: [boss@high.com]
  Password: [123456789]

  For the Authentication we will make use of firebase. The credentials be in the firebase.ts file. 
  Therefore the login flow is as follows:
   admin user -> setttings, chart, preview
   user -> chart. (In the presentation page it only shows only the chart as requested and nothing else.)
   
#[New] Chart Page modifications - this is the presentation Page. (this is the page that will be displayed upon normal user login - (It should be the initial page loaded upon opening the app for a user))
    - The page should be made full screen and the chart should be the only content on the page.
    - Remove the vertical sections holding the vertical nav bar and the vertical bar holding the category labels.But its important the Logo image be visible in the top left corner of the page. Show the logged in User in the top right corner of the page. The user name should be aligned to the left and the logout button aligned to the right and aligned to the vertical center of the text(Maintained just as it currently is)
    - The chart section should be displayed in the center of the page and it should fill the entire height & width of the screen view. (100% Height and 100% Width)

    - The Chart section it self will undergo the following modifications:
        - Instead of 3 chart types, there will be only 1 chart Type (the Bar chart). The chart selection section floating in the bottom center of the chart should be removed .THerefore on this new Chart screen which is the presentation mode will not have a means of chart type selection. Only 1 chart type is to be used - THE BAR CHART.
        -  The TimeFrames section should be modified as follows: Instead of Hour, minutes, seconds,The Timeframes should be Daily, Hourly, 10 Minutes.
         ## Daily
          The Daily chart should display the Hours of the day (in 24 hr format 08:00 - 17:00) as a continuous timeline on the X-Axis
          The Y-axis should be as it is currently
        - The Chart itself should have another floating section on the right which will be a Vertical component showing the Volumes for the whole day. The preset volume per day(which will be regarded her on after as the target volume for that day) BUT the volume which will be simulated will actually be at the max of 85% percent of the target volume, so if we have a preset of 500 as volume for the day then the target volume is 500 and the actual volume to be simulated will be 85% of the target volume(Now the percentage to determine the actual volume from the target volume will be provided in the settings page on a per category basis, so for every category, we will be able to set the percentage for Actual sell out volume). For example if the total sales for the day was preset at 500 between 8AM and 5PM , then as the total amount of volume is rising to 500 , a green bar which will overlay a gray colored bar of full width. 

        ###UI and Feel of the Vertical Floating Bar Component
        So This vertical bar should be of a total height of 80% of the screen height, perfectly centered vertically. It will be placed on the right side of the screen. This component will have 2 types of vertical bars the main bar simply a gray colored bar of full width containing a green bar overlaying it which will represents the current consumed volume for the day. The green bar's width will increase as the volume increases. (Basically progress bae style).The second bar is rather a UI component that will display the bars for the individual hours of the day. The bars for the individual hours of the day will be displayed in a form of stacked bars which are horizontal bars () stacked on eachother with 3px gap between them. (Each bar should represent an hour on the hour timeframe or 10 minutes on the 10 minute timeframe depending on what timeframe is selected). The total width of this UI component should be same height as the main bar. The height of each individual bar should be equal to 0.5% of the total height of the UI component and the width of each individual bar should be representation of the volume consumed in that hour or 10 minutes. So basically the width of that individual hour or 10 minute stacked bar is a percentage width of the parent UI component determined by the total volume consumed in that hour/10 minutes divided by the total volume for the day multiplied by 100% to give you the percentage width of each individual horizontal bar.(%widthOfHorizontalBar = (ActualVolumeIn1HourOr10Minutes) * 100 / TotalVolumeForDay)
        (Example: 
            If the preset total volume for the day is 1000 and the actual volume consumed in the first hour is 50, the width of the horizontal bar for that hour should be 5% (50 * 100 / 1000)). 
            If the preset total volume for the day is 1000 and the actual volume consumed in the second hour is 50, the width of the horizontal bar for that hour should be 5% (50 * 100 / 1000)). 
            If the preset total volume for the day is 1000 and the actual volume consumed in the third hour is 50, the width of the horizontal bar for that hour should be 5% (50 * 100 / 1000)). 
            The sum of the widths of all the horizontal bars should be equal to 100% of the total height of the UI component.
        )
        Interactions: 
         On Hover of the main bar(the gray colored bar with the green bar overlaying it) , The secondary UI component should display the bars for the individual hours of the day.Onclick of any individual stacked bar(horizontal bar) in the secondary component , should display the same popover like the one shown onclick of any point on the chart, which should display the same information but this time around for that hour or 10minutes.
         On mouseOut of the secondary UI component , the component should disappear and the main bar should be displayed as it was before hovering.
        Extra Information: 
          Added to the original preset values of the volumes exhaustible per 10minutes or hourly, There can be sudden new data which can be made available, that is BULK VOLUME . For any given hour or 10minutes,if a bulk volume of X is received, it should be added to the current hour/10minutes and then the green bar for the current hour/10minutes should update to reflect the new total volume, But this time the green bar should not be a solid green color, it should be a gradient of green with yellow color.If onclick of this bar the Popover should give us the breakdown showing us how much volume as well was a bulk volume and how much of it was the Normal volume.
          For example if at 9:00 AM the preset volume is 100 and between 9:00AM and 10:00 AM, 50 is the normal volume consumed and then a bulk volume of 25 is received , then the total volume for the hour is 75. So the Popover for that hour should display "Normal Volume: 50, Bulk Volume received: 25, Total Volume: 75".
          In 10 minutes a bulk volume can only be received 10 times max. This will be setup in the settings page. By setting a value and just clicking send BulkVolume button, the bulk volume will be added to the current hour/10minutes depending on what is choosen. You can only click this button 10 times max. In the current 10 minutes after which the button is grayed out.
# Preview Page :
    The Preview page will be exactly the same as the current version 1 setup of the Chart page with only a few minor modifications:
    - To the vertical menu bar we will have the settings icon now active and then it should link to the settings page.
    - This preview page will help the admin to see how the chart looks for the user as he makes changes on the settings page.
    - The chart here on this page should also have the same modifications as the chart modifications above.Exactly the same chart described above with all the upgrades.
    - preserve the category vertical bar and the chart selection menu on the chart itself (floating bottom center).
    - the category vertical bar will show all the categories as before but this time around on every category component we should have the an indication of the current target volume and the current actual volume in the selected TimeFrame.
   
# Settings Page Changes:
    The Settings page should be modified as follows:
    - This page will show the settings for the chart as per categories just like in version 1 but with a few modifications:
        -At the Top of the Page we should have a tabbed navigation menu with two options['Presets ','Live Control'].
        ## Presets Tab:
        - Clicking on 'Presets' tab will take you to the current version 1 settings page with an extra option to add a new custom category and a 'Default' category which should always be visible on load of the chart(If the default is not selected, then the most recently added category is also set as default).
        - On creation of a new category it should open a modal to receive the following values to initialize the category :
            - Daily Volume Target (provided by the user). This target will be spread evenly across the Hours in the hourly setting by default. For example, if the daily Target volume is set to 1000 and the timeframe is set to hourly (which going to be default), then each hour will have a target volume of 125 (1000 / 8), corresponding to 8AM to 9AM - 125 and so on till 4AM - 5PM. 
            - Starting price (provided by the user)
            - Ending price (provided by the user). Should only be editable if the starting price is also provided.If Continuous is selected for price variation then this value should be used to calculate the price step.If Hourly is selected for price variation then this value should be used to calculate the price step.
            - Day hours (option to select between Daylight or 24Hours. If 24Hours is selected, then the target volume will be spread evenly across the 24 hours of the day. For example, if the daily Target volume is set to 1000 and the timeframe is set to hourly (which going to be default), then each hour will have a target volume of 125 (1000 / 8), corresponding to 8AM to 9AM - 125 and so on till 4AM - 5PM. )
        ## Live Control Tab:
            - this tab should hold the controls to modify the volume quantities on the live chart in realtime.
            - In the live control section the should show the current target volume and current actual volume for each category in the selected TimeFrame.
            - For each category there should be a button to add or subtract the volume quantity in the current time frame by a certain amount(provided by the user). So I should be able to modify the preset volume on the Hourly (8AM to 9AM for example) 
            - The  Bulk Volume Settings:
              for the Bulk volume bumps we should have a setting to control how much volume should each bump be. For example if the user sets the bulk volume to 100, then each bump (upon clicking the send bulk volume button) will be of 100 volumes. And this will be added to the current hour/10minutes depending on what is choosen. So that to Bump in this current 10 minutes I just need to select 10 mins and input the value by which I will bump and click send bulk volume button. And this should be updated on the fly in the chart. This will cause the chart's actual volume to go  up and corresponding stacked bar in the chart's vertical progress bar to reflect this with a distinct color for the extra volume i.e the bulk volume.


# Simulation Changes:
    - Now we are no longer rendering only second by second data and corresponding minutes aggregation. This time around the aggregation should be 10 minutes not just one minute .Therefore on the 10 minutes timeframe, each Bar will represent 60 * 10 bars from the seconds timeframe. which stands for 60secs which is 1 minute and 10 such bars are aggregated to form one bar in the 10 minutes timeframe.
    - On the Hourly Timeframe the a single bar should represent 1 hour which is equivalent to 6 such bars in the 10 minutes timeframe. The time intervals for the hourly chart should be set on the horizotal axis as follows : 08:00, 09:00, 10:00, ... 17:00 (For Daylight).
                                                                                00:00, 01:00, 02:00, ... 23:00 (For 24Hours).   
    - On the Daily Timeframe the a single bar should represent 1 day which is equivalent to 24 such bars in the hourly timeframe. The time intervals for the daily chart should be set on the horizotal axis as follows : 00:00, 01:00, 02:00, ... 23:00
 # Rendering Changes:
    - all the data be the actual time of the day is rendered on the chart and only the data after the current time of the day will be animated.THerefore if the actual time of the day is 11:15AM then the bar for 11:00AM and the bars before 11:00AM should be fully rendered, the bar for 11:15AM should be partially rendered and animated (as the current time is in the 15th minute of the 11th hour) and the bar for 11:30AM should not be rendered at all it will be animated as the current time also evolves.
    ## Performance 
    We will now be using Firebase firestore for the values instead of the localstorage and therefore , we will keep the same prefetch logic as we are currently doing on the chart page for the 3 timeframes just that this time we are prefetching the data for just the current category which is being rendered. WE Prefetch the next Hour while the current hour is rendering.The logic will definitely use the available data and calculate the seconds rendering then aggregate these into 10mins, Hourly and daily timeframes no need to get for all the timeframes always.

#SIMULATION NOTES:
-Everyother thing about the simulation core should be the same as the version 1 (chart page) just that now we are using real data from the firebase. The Distribution functions should be exactly the same as that of version 1 only this time the data will be aggregated to 10 minutes and not minute by minute , then Hour by Hour and then Day by day.

#Firebase Notes:
    - We are using Auth to authenticate users. 
    - Determine all schemas and collections for firestore as per the application requirements
    - the Firebase config settings will be available in the firebase.ts
    -
