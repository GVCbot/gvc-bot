// commands/staff/punishmentTemplates.js

module.exports = {
  documented_warning: {
    label: "Documented Warning",
    allowedRoles: ["1350897509752373341"], // Staff Team
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`1 Documented Warning`* *within [Greenville Community](https://discord.gg/gvc).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
    ],
  },

  mark: {
    label: "Mark",
    allowedRoles: ["1350897509752373341"], // Staff Team
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`1 Mark`* *within [Greenville Community](https://discord.gg/gvc).*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
      "- *Receiving three Marks will get you an* ***Infraction*** *within [Greenville Community](https://discord.gg/gvc).*",
    ],
  },

  mark2: {
    label: "2 Marks",
    allowedRoles: ["1350897509752373341"],
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`2 Marks`* *within [Greenville Community](https://discord.gg/gvc).*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
      "- *Receiving three Marks will get you an* ***Infraction*** *within [Greenville Community](https://discord.gg/gvc).*",
    ],
  },

  infraction: {
    label: "Infraction",
    allowedRoles: ["1350897509752373341"],
    suspensionDays: null,
    dm: [
      "- *You have been issued* *`1 Infraction`* *within [Greenville Community](https://discord.gg/gvc).*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
      "- *Receiving four Infractions will get you* ***Banned*** *from [Greenville Community](https://discord.gg/gvc).*",
    ],
  },

  infraction2: {
    label: "2 Infractions",
    allowedRoles: ["1350897509752373341"],
    suspensionDays: null,
    dm: [
      "- *You have been issued* *`2 Infractions`* *within [Greenville Community](https://discord.gg/gvc).*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
      "- *Receiving four Infractions will get you* ***Banned*** *from [Greenville Community](https://discord.gg/gvc).*",
    ],
  },

  infraction2_7d: {
    label: "2 Infractions + 7d Suspension",
    allowedRoles: ["1350897509752373341"],
    suspensionDays: 7,
    dm: [
      "- *You have been* *`Suspended`* *and issued* *`2`* ***Infractions** from [Greenville Community](https://discord.gg/gvc) until @time.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
    ],
  },

  infraction2_14d: {
    label: "2 Infractions + 14d Suspension",
    allowedRoles: ["1350897509752373341"],
    suspensionDays: 14,
    dm: [
      "- *You have been* *`Suspended`* *and issued* *`2`* ***Infractions** from [Greenville Community](https://discord.gg/gvc) until @time.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Moderation Appeal Form](https://docs.google.com/forms/d/e/1FAIpQLSeI_Q5xlI5WywrThW13x7yc61mBsrUulsmlBiOBGUrNJu1mDw/viewform?usp=header).*",
      "- *Click [here](https://discord.com/channels/1058305800252182528/1451547220498186418) to report a Staff Member.*",
    ],
  },

  // ============================
  // STAFF PUNISHMENTS
  // ============================

  staff_mark: {
    label: "Staff Mark",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`1 Staff Mark`* *within the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *Receiving two Staff Marks will get you a* ***Staff Strike*** *within the Greenville Community Staff Team.*",
    ],
  },

  staff_mark2: {
    label: "2 Staff Marks",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`2 Staff Marks`* *within the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *Receiving two Staff Marks will get you a* ***Staff Strike*** *within the Greenville Community Staff Team.*",
    ],
  },

  staff_strike: {
    label: "Staff Strike",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`1 Staff Strike`* *within the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *Receiving three Staff Strikes will get you* ***Terminated*** *from the Greenville Community Staff Team.*",
    ],
  },

  staff_strike2: {
    label: "2 Staff Strikes",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: null,
    dm: [
      "- *You have been issued*  *`2 Staff Strikes`* *within the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *Receiving three Staff Strikes will get you* ***Terminated*** *from the Greenville Community Staff Team.*",
    ],
  },

  staff_strike2_7d: {
    label: "2 Staff Strikes + 7d Staff Suspension",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: 7,
    dm: [
      "- *You have been given*‎‎ *`2`* ***Staff Strike(s)*** and *`Suspended`* *from the [Greenville Community](https://discord.gg/gvc) Staff Team until @time.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
    ],
  },

  staff_strike2_14d: {
    label: "2 Staff Strikes + 14d Staff Suspension",
    allowedRoles: ["1350582649210798100", "1350582607217430650"],
    suspensionDays: 14,
    dm: [
      "- *You have been given*‎‎ *`2`* ***Staff Strike(s)*** and *`Suspended`* *from the [Greenville Community](https://discord.gg/gvc) Staff Team until @time.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
    ],
  },

  staff_termination: {
    label: "Staff Termination",
    allowedRoles: ["1350582607217430650"], // HR ONLY
    suspensionDays: null,
    dm: [
      "- *You have been* *`Terminated`* *from the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *You may re-apply to the Staff Team, but you have a lower chance of getting in.*",
      "- *Receiving two Terminations will get you* ***Blacklisted*** *from the Staff Team.*",
    ],
  },

  staff_blacklist: {
    label: "Staff Blacklist",
    allowedRoles: ["1350582607217430650"], // HR ONLY
    suspensionDays: null,
    dm: [
      "- *You have been* *`Blacklisted`* *from the [Greenville Community](https://discord.gg/gvc) Staff Team.*",
      "- *If you feel like this punishment is invalid or an abuse of power, submit an [Staff Moderation Appeal Form](https://forms.gle/UphPsuAPrB9ardq97).*",
      "- *You may not reapply to the Staff Team.*",
    ],
  },
};
