export const common = {
  no_clans_found: 'No clans were found on this server for the specified input! \nUse {{command}} command to link a clan.',
  no_clans_linked: 'No clans are linked to this server. Why not link some? \nUse {{command}} command to link a clan.',
  clan_limit:
    'The maximum number of clans has reached. Please consider supporting us on our [Patreon](https://patreon.com/clashperk) to add more than two clans.\n\nAlready subscribed? Use {{command}} command.',
  patreon_only:
    'This command is only available on Patreon subscribed servers. Please consider supporting us on our [Patreon](https://patreon.com/clashperk) to use this command.\n\nAlready subscribed? Use {{command}} command.',
  clan_verification:
    'We need to ensure that you are a leader or co-leader of this clan. Please verify your player account with the API token.\nUse the {{command}} command to verify your player account. The API token is available in the Game settings.',
  no_option: 'Something went wrong while executing this command. (option not found)',
  no_data: 'No data is available at this moment. We are still collecting!',
  no_clan_data: 'No data is available for {{clan}}. We are still collecting!',
  no_clan_members: '\u200e{{clan}} does not have any clan members.',
  fetch_failed: 'Something went wrong while fetching data from the API.',
  component: {
    expired: 'This component is no longer active. Execute the command again.',
    unauthorized: 'You must execute the command to interact with the components.'
  },
  no_clan_tag_first_time: 'You must provide a clan tag to execute this command!',
  no_clan_tag:
    'You must provide a clan tag to execute this command! \nAlternatively, you can link a default clan to your profile using the {{command}} command.',
  no_player_tag:
    'You must provide a player tag to execute this command!, \nAlternatively, you can link some accounts to your profile using the {{command}} command.',
  clan_not_linked: 'No clan is linked to {{user}}. \nUse {{command}} to link a clan.',
  player_not_linked: 'No player is linked to {{user}}. Use {{command}} command to link a player.',
  guild_unauthorized: 'This server is not authorized for {{clan}}. Use {{command}} command to link a clan.',
  status_code: {
    '400': 'An unknown error occurred while handling the request (400)',
    '403': 'An unknown error occurred while handling the request (403)',
    '404': 'No matches were found for the specified tag.',
    '429': 'An unknown error occurred while handling the request (429)',
    '500': 'An unknown error occurred while handling the request (typically happens during the season reset in the game)',
    '503': 'Service is temporarily unavailable because of the maintenance break in the game.',
    '504': 'An unknown error occurred while handling the request (504)'
  },
  clan_tag_argument: 'Clan tag or alias or @user mention.',
  player_tag_argument: 'Player tag or @user mention.',
  maintenance_start: 'The maintenance break has started!',
  maintenance_end: 'The maintenance break is ending soon! {{duration}}',
  something_went_wrong: 'Something went wrong while executing this command.',
  missing_access: 'The bot is missing {{permission}} in {{channel}} to execute this command.',
  missing_manager_role:
    'You are missing the **Manage Server** permission or the [Bot Manager](<https://docs.clashperk.com/others/bot-manager>) role to perform this action.',
  choices: {
    yes: 'Yes',
    no: 'No'
  },
  color_code: 'Color Code',
  options: {
    clan: {
      tag: {
        description: 'Clan tag or name or alias.'
      },
      user: {
        description: 'Clan by @user mention or ID.'
      }
    },
    player: {
      tag: {
        description: 'Player tag or name.'
      },
      user: {
        description: 'Player by @user mention or ID.'
      }
    }
  },
  labels: {
    clan_games: 'Clan Games',
    clan_games_ending: 'Clan Games (Ending)',
    cwl: 'CWL',
    cwl_end: 'CWL (Ending)',
    cwl_signup_ending: 'CWL Signup (Ending)',
    league_reset: 'League Reset',
    season_end: 'Season End',
    raid_weekend: 'Raid Weekend',
    raid_weekend_ending: 'Raid Weekend (Ending)'
  },
  contact_support: 'Contact Support'
} as const;

export const command = {
  activity: {
    description: 'Shows a graph of hourly-active clan members.',
    description_long: 'Shows a graph of hourly-active clan members.',
    title: 'Hourly-active Clan Members',
    options: {
      clans: {
        description: 'Clan tags or aliases (Maximum 3)'
      },
      days: {
        description: 'The number of days is displayed in the graph.'
      },
      limit: {
        description: 'Number of clans to show in the graph.'
      }
    }
  },
  clan_games: {
    description: 'Clan games scoreboard of clan members.',
    description_long: 'Clan games scoreboard of clan members.',
    title: 'Clan Games Scoreboard',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      season: {
        description: 'The season to show the scoreboard for.'
      }
    }
  },
  capital: {
    description: 'Shows clan capital contributions and raids.',
    contribution: {
      description: 'Shows clan capital contributions.',
      description_long: 'Shows clan capital contribution of clan members.',
      title: 'Clan Capital Contributions',
      options: {
        tag: {
          description: 'Clan tag or alias or @user mention.'
        },
        week: {
          description: 'The week to show contributions for.'
        },
        season: {
          description: 'The season to show contributions for.'
        }
      }
    },
    raids: {
      description: 'Shows clan capital raids.',
      description_long: 'Shows raid weekend scores of clan members.',
      title: 'Clan Capital Raids',
      options: {
        tag: {
          description: 'Clan tag or alias or @user mention.'
        },
        week: {
          description: 'The week to show raids for.'
        },
        season: {
          description: 'The season to show raids for.'
        }
      },
      no_data: 'No capital raids found for {{clan}} [{{weekId}}].'
    }
  },
  legend: {
    description: 'Shows legend logs for a player.',
    attacks: {
      description: 'Shows per-day legend attacks for a clan.',
      description_long: 'Shows per-day legend stats for a clan.',
      options: {
        clans: {
          description: 'Enter a tag or pick one form the autocomplete list.'
        },
        day: {
          description: 'The league day.'
        }
      }
    },
    days: {
      description: 'Shows per-day legend attacks for a player.',
      description_long: 'Shows per-day legend stats for a player or an user.',
      options: {
        player: {
          description: 'Enter a tag or pick one form the autocomplete list.'
        }
      }
    },
    leaderboard: {
      description: 'Shows legend leaderboard.',
      options: {
        clans: {
          description: 'Enter a tag or pick one form the autocomplete list.'
        },
        limit: {
          description: 'Limit the number of results.'
        },
        season: {
          description: 'Season of the leaderboard'
        },
        enable_auto_updating: {
          description: 'Enable auto updating (every 30-60 mins)',
          choices: {
            legend_leaderboard: 'Legend Trophies',
            bb_legend_leaderboard: 'Builder Trophies'
          }
        }
      }
    },
    stats: {
      description: 'Shows statistics of legend ranks and trophies.'
    }
  },
  leaderboard: {
    description: 'Leaderboard of the top clans and players.',
    options: {
      clans: {
        description: 'Top clans leaderboard.',
        options: {
          location: {
            description: 'Location of the leaderboard'
          },
          season: {
            description: 'Season of the leaderboard'
          }
        }
      },
      players: {
        description: 'Top players leaderboard.',
        options: {
          location: {
            description: 'Location of the leaderboard'
          },
          season: {
            description: 'Season of the leaderboard'
          }
        }
      },
      capital: {
        description: 'Top capital leaderboard.',
        options: {
          location: {
            description: 'Location of the leaderboard'
          },
          season: {
            description: 'Season of the leaderboard'
          }
        }
      }
    }
  },
  lastseen: {
    description: 'The last seen time and activities of clan members.',
    description_long: 'The last seen time and activities of clan members.',
    title_lastseen: 'Last seen and activity scores (last 24h)',
    title_activity: 'Clan member activities (last 30d)',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  alias: {
    description: 'Create, delete or view clan aliases.',
    create: {
      description: 'Creates a clan alias (short code or abbreviation) or clan nickname.',
      description_long: 'Creates a clan alias (short code or abbreviation) or clan nickname.',
      options: {
        alias_name: {
          description: 'Name of the alias.'
        },
        clan_nickname: {
          description: 'Nickname of the clan (Experimental)'
        },
        clan: {
          description: 'Tag of the clan.'
        }
      },
      no_name: 'You must specify an alias name to execute this command.',
      no_hash: 'A clan alias must not start with a hash.',
      no_whitespace: 'A clan alias must not contain whitespace.',
      no_clan: 'You must specify a clan tag to execute this command.',
      exists: 'An alias with the name {{name}} already exists.',
      clan_not_linked: 'The clan must be linked to the server to create an alias.',
      success: 'Clan alias or nickname updated.'
    },
    delete: {
      description: 'Deletes a clan alias.',
      description_long: 'Deletes a clan alias.',
      options: {
        name: {
          description: 'Tag of a clan or name of an alias'
        }
      },
      no_name: 'You must provide a clan tag or clan alias to execute this command.',
      no_result: 'No matches were found with the tag or alias {{name}}.',
      success: 'Successfully deleted the clan alias {{name}}.'
    },
    list: {
      description: 'List all clan aliases.',
      description_long: 'List all clan aliases.',
      title: 'Clan Aliases'
    }
  },
  config: {
    description: 'Configure server settings.',
    description_long: 'Configure general server settings (color_code, events_channel, webhook_limit)',
    options: {
      color_code: {
        description: 'Hex color code (e.g #ed4245)'
      },
      maintenance_notification_channel: {
        description: 'In-game maintenance break notification channel.'
      },
      manager_role: {
        description: 'Role that can manage the bot.'
      },
      roster_manager_role: {
        description: 'Role that can manage the roster members.'
      },
      flags_manager_role: {
        description: 'Role that can manage the flags.'
      },
      links_manager_role: {
        description: 'Role that can manage the Discord links.'
      },
      webhook_limit: {
        description: 'The maximum number of webhooks that can be created in a channel.'
      }
    },
    no_text_channel: 'You must specify a text channel to enable this event log.',
    title: 'Server Settings',
    maintenance_notification_channel: 'Maintenance Break Notification Channel'
  },
  debug: {
    description: 'Displays some basic debug information.',
    description_long: 'Displays some basic debug information.'
  },
  cwl: {
    description: 'CWL season summary and overview.',
    options: {
      option: {
        description: 'Select an option.'
      },
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    },
    still_searching: 'Your clan {{clan}} is still searching for the opponent.',
    not_in_season: 'Your clan {{clan}} is not in the CWL season.',
    no_rounds: 'No CWL rounds have been played yet, try again after some time.',
    no_season_data: 'No CWL stats are available for the season {{season}}.',
    attacks: {
      description: 'Shows an overview of attacks for different CWL rounds.',
      description_long: 'Shows an overview of attacks for different CWL rounds.'
    },
    lineup: {
      description: 'Shows CWL lineup for a round (sorted by town hall and heroes).',
      description_long: 'Shows CWL lineup for a round (sorted by town hall and heroes).'
    },
    members: {
      description: 'Shows a list of all CWL participants.',
      description_long: 'Shows a list of all CWL participants.'
    },
    history: {
      description: 'Shows CWL history of a player or user.',
      description_long: 'Shows CWL history of a player or user.'
    },
    roster: {
      description: 'CWL roster and town hall distribution.',
      description_long: 'Shows entire roster of Town halls for a CWL group.',
      options: {
        tag: {
          description: 'Clan tag or alias or @user mention.'
        }
      }
    },
    round: {
      description: 'CWL summary for the current round.',
      description_long: 'Shows an overview of a CWL round.',
      options: {
        tag: {
          description: 'Clan tag or alias or @user mention.'
        },
        round: {
          description: 'Round number to show.'
        },
        season: {
          description: 'CWL season'
        }
      }
    },
    stars: {
      description: 'Shows CWL member ranking by stars.',
      description_long: 'Shows CWL member ranking by stars.'
    },
    stats: {
      description: 'Shows an overview of all CWL rounds and group standings.',
      description_long: 'Shows an overview of all CWL rounds and group standings.'
    }
  },
  roster: {
    description: 'Comprehensive roster management system',
    options: {
      create: {
        description: 'Create a roster',
        options: {
          clan: {
            description: 'Clan of the roster'
          },
          name: {
            description: 'Name of the roster'
          },
          category: {
            description: 'Category of the roster',
            choices: {
              cwl: 'CWL',
              war: 'WAR',
              esports: 'ESPORTS',
              trophy: 'TROPHY'
            }
          },
          import_members: {
            description: 'Whether to import members from the clan'
          },
          allow_unlinked: {
            description: 'Whether to allow unlinked members'
          },
          max_members: {
            description: 'Roster size'
          },
          max_accounts_per_user: {
            description: 'Max accounts per user'
          },
          min_town_hall: {
            description: 'Minimum Town Hall level'
          },
          max_town_hall: {
            description: 'Maximum Town Hall level'
          },
          min_hero_level: {
            description: 'Minimum combined Hero level'
          },
          roster_role: {
            description: 'Roster role'
          },
          sort_by: {
            description: 'Sorting order of the roster member list'
          },
          start_time: {
            description: 'Roster start time (YYYY-MM-DD HH:mm, in 24 hours format)'
          },
          end_time: {
            description: 'Roster end time (YYYY-MM-DD HH:mm, in 24 hours format)'
          },
          timezone: {
            description: 'Search timezone by city or country (e.g. London, Singapore, India, Sydney)'
          },
          allow_group_selection: {
            description: 'Whether to allow members to select group'
          },
          allow_multi_signup: {
            description: 'Whether to allow multiple roster signups'
          },
          use_clan_alias: {
            description: 'Whether to use clan alias in the roster (created by /alias command)'
          },
          roster_image_url: {
            description: 'Image to be used in the roster embed'
          },
          color_code: {
            description: 'Hex color code of the roster embed'
          }
        }
      },
      post: {
        description: 'Post a roster to signup or view members',
        options: {
          roster: {
            description: 'Select a roster to post'
          }
        }
      },
      clone: {
        description: 'Clone a roster to create a new one',
        options: {
          roster: {
            description: 'Select a roster to clone'
          },
          name: {
            description: 'Name of the cloned roster'
          }
        }
      },
      list: {
        description: 'Search rosters or list all rosters and groups',
        options: {
          name: {
            description: 'Search rosters by name'
          },
          user: {
            description: 'Search rosters by user'
          },
          player: {
            description: 'Search rosters by player'
          },
          clan: {
            description: 'Search rosters by clan'
          }
        }
      },
      edit: {
        description: 'Edit a roster',
        options: {
          roster: {
            description: 'Select a roster to edit'
          },
          detach_clan: {
            description: 'Detach clan from the roster'
          },
          delete_role: {
            description: 'Whether to delete the roster role'
          },
          log_channel: {
            description: 'Channel to log roster changes'
          }
        }
      },
      delete: {
        description: 'Permanently delete a roster.',
        options: {
          roster: {
            description: 'Select a roster to delete'
          }
        }
      },
      manage: {
        description: 'Add or remove users or change their group or roster',
        options: {
          roster: {
            description: 'Select a roster to manage'
          },
          action: {
            description: 'Select an action to perform',
            choices: {
              add_user: 'Add',
              remove_user: 'Remove',
              change_roster: 'Change roster',
              change_group: 'Change group'
            }
          },
          player: {
            description: 'Select a player to manage'
          },
          clan: {
            description: 'Select a clan to add players from'
          },
          user: {
            description: 'Select a user to manage'
          },
          target_group: {
            description: 'Group of the user to move to'
          },
          target_roster: {
            description: 'Roster of the user to move to'
          }
        }
      },
      groups: {
        description: 'Manage groups of the rosters',
        options: {
          create: {
            description: 'Create a group',
            options: {
              name: {
                description: 'Name of the group'
              },
              group_role: {
                description: 'Role of the group'
              },
              selectable: {
                description: 'Whether to allow members to select this group'
              }
            }
          },
          modify: {
            description: 'Modify or delete a group',
            options: {
              group: {
                description: 'Select a group to modify'
              },
              name: {
                description: 'Name of the group'
              },
              order: {
                description: 'Order of the group'
              },
              selectable: {
                description: 'Whether to allow members to select this group'
              },
              delete_role: {
                description: 'Whether to delete the role of the group'
              },
              delete_group: {
                description: 'Whether to delete the group'
              }
            }
          }
        }
      },
      ping: {
        description: 'Ping members in the roster',
        options: {
          roster: {
            description: 'Select a roster to ping'
          },
          message: {
            description: 'Message for the members'
          },
          ping_options: {
            choices: {
              unregistered: "Unregistered (didn't signup, but in the clan)",
              missing: 'Missing (opted-in, but not in the clan)',
              everyone: 'Everyone (all opted-in members)'
            }
          },
          group: {
            description: 'Select a group to ping (Overwrites ping options)'
          }
        }
      }
    }
  },
  round: {
    description: 'CWL summary for the current round.',
    description_long: 'Shows an overview of a CWL round.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      round: {
        description: 'Round number to show.'
      }
    }
  },
  export: {
    description: 'Export war/season/clan stats to Excel.',
    options: {
      option: {
        description: 'Select an option.'
      },
      season: {
        description: 'Retrieve data since the specified season.'
      },
      clans: {
        description: 'Clan tags or aliases to filter clans.'
      },
      wars: {
        description: 'Number of wars (Default: 25)'
      }
    },
    cwl: {
      description: 'Export CWL wars stats.',
      description_long: 'Export CWL stats to Excel.',
      options: {
        lineup_only: {
          description: 'Export only the lineup.'
        }
      }
    },
    last_wars: {
      description: 'Export participation history (last played wars)',
      description_long: 'Export participation history (last played wars)',
      options: {
        war_type: {
          description: 'Regular or CWL',
          choices: {
            regular: 'Regular',
            cwl: 'CWL'
          }
        }
      }
    },
    members: {
      description: 'Export clan members.',
      description_long: 'Export a comprehensive version of clan member stats.'
    },
    missed: {
      description: 'Export missed attack history.',
      description_long: 'Export missed attack history.'
    },
    season: {
      description: 'Export season stats of the clan family.',
      description_long: 'Export comprehensive seasonal stats of clan members.'
    },
    wars: {
      description: 'Export war stats.',
      description_long: 'Export War stats to Excel.',
      options: {
        war_type: {
          description: 'Regular or friendly wars (defaults to Regular)',
          choices: {
            regular: 'Regular',
            friendly: 'Friendly'
          }
        }
      }
    },
    user: {
      description: 'Export Discord members',
      options: {
        role: {
          description: 'Role to filter users.'
        }
      }
    },
    attack_log: {
      description: 'Export war attack history.',
      options: {
        war_type: {
          description: 'CWL or Regular wars (default to Regular and CWL)',
          choices: {
            regular: 'Regular',
            cwl: 'CWL',
            friendly: 'Friendly'
          }
        }
      }
    },
    capital_raids: {
      description: '[Experimental] Export capital raid attack stats.'
    },
    capital: {
      description: 'Export clan capital weekends.'
    },
    rosters: {
      description: 'Export all rosters.',
      options: {
        category: {
          description: 'Roster category.',
          choices: {
            cwl: 'CWL',
            war: 'WAR',
            esports: 'ESPORTS'
          }
        }
      }
    }
  },
  flag: {
    description: 'Create, delete or search player flags.',
    create: {
      description: 'Create a player flag.',
      description_long: 'Create a player flag to mark the player as banned or flagged.',
      options: {
        flag_type: {
          description: 'The type of the flag (ban or strike)'
        },
        choices: {
          ban: 'Ban',
          strike: 'Strike'
        },
        tag: {
          description: 'The tag of a player to flag.'
        },
        reason: {
          description: 'Reason for the flag.'
        },
        flag_expiry_days: {
          description: 'Flag expiry days (auto deletes the flag)'
        },
        flag_impact: {
          description: 'Number of flags this should count as'
        }
      },
      no_reason: 'You must provide a reason for the flag.',
      reason_max_limit: 'The reason must be 1024 or fewer in length.',
      success: 'Successfully flagged {{count}} player(s). \n{{players}}'
    },
    delete: {
      description: 'Delete a player flag.',
      description_long: 'Delete a player flag.',
      options: {
        tag: {
          description: 'The tag of a player to delete.'
        },
        flag_ref: {
          description: 'Flag reference of this player.'
        }
      },
      no_tag: 'You must provide a player tag to delete a flag.',
      no_result: 'No matches were found with the tag {{tag}}.',
      success: 'Successfully deleted the flag with the tag {{tag}}.'
    },
    list: {
      description: 'List all player flags.',
      description_long: 'List all player flags.',
      options: {
        flag_type: {
          description: 'The type of the flag (ban or strike)',
          choices: {
            ban: 'Ban',
            strike: 'Strike'
          }
        },
        player: {
          description: 'Show all flags against a player'
        },
        export: {
          description: 'Export all player flags to Excel.'
        }
      },
      no_flags: 'No flags have been created.'
    },
    search: {
      description: 'Search for a player flag.',
      description_long: 'Search for a player flag.',
      options: {
        tag: {
          description: 'The tag of a player to search.'
        }
      },
      not_found: 'No matches were found with the tag {{tag}}.'
    }
  },
  link: {
    description: 'Create, delete or list player links.',
    no_tag: 'You must specify a player/clan tag to execute this command.',
    create: {
      description: 'Links a player account/clan to a Discord account.',
      description_long: 'Links a player account/clan to a Discord account.',
      options: {
        tag: {
          description: 'Tag of a player or clan.'
        },
        user: {
          description: 'User account to link to the tag.'
        },
        is_default: {
          description: 'Whether to set this as the default account.'
        },
        player_tag: {
          description: 'The player tag to link.'
        },
        clan_tag: {
          description: 'The default clan tag to link.'
        }
      },
      no_bots: 'Bot accounts are not allowed to be linked.',
      fail: 'This player or clan tag is not valid.',
      prompt: 'What would you like to link? A Player or a Clan?',
      success: 'Successfully linked {{target}} to {{user}}.',
      link_exists: '{{player}} is already linked.',
      already_linked: '{{player}} is already linked to another user. If you own this account, please use the {{command}} command.',
      max_limit: 'The maximum account limit has been reached. (25 accounts/user)'
    },
    delete: {
      description: 'Deletes a player account/clan from a Discord account.',
      description_long: 'Deletes a player account/clan from a Discord account.',
      options: {
        player_tag: {
          description: 'The player tag to unlink.'
        },
        clan_tag: {
          description: 'The clan tag to unlink.'
        },
        tag: {
          description: 'Tag of a player or clan.'
        }
      },
      no_result: 'No matches were found with the tag {{tag}}.',
      success: 'Successfully deleted the link with the tag {{tag}}.',
      no_access:
        'This player should be in your clan and you must be a "Verified" Co/Leader to perform this action. Use {{command}} to verify your account.'
    },
    list: {
      description: 'List all player links.',
      description_long: 'List all player links of a clan.',
      options: {
        clan: {
          description: 'Clan tag or alias or @user mention.'
        }
      }
    }
  },
  verify: {
    description: 'Verify and link a player using an API token.',
    description_long: 'Verify and link a player account using an API token.',
    options: {
      tag: {
        description: 'Tag of the player to verify.'
      },
      token: {
        description: 'API token that can be found in the game settings.'
      }
    },
    success: 'Verification successful! {{info}}',
    invalid_token: 'You must provide a valid API Token that can be found in the game settings. \nhttps://i.imgur.com/8dsoUB8.jpg'
  },
  timezone: {
    description: 'Set your timezone offset.',
    description_long: 'Set your timezone offset for /activity command.',
    options: {
      location: {
        description: 'Search timezone by city or country. (e.g. London, New York, Singapore, India, Sydney)'
      }
    },
    set: 'Please set your timezone with the `/timezone` command. It enables you to view the graphs in your timezone.',
    no_result: 'Make your search more specific and try again.'
  },
  profile: {
    description: 'Shows user info and linked accounts.',
    description_long: 'Shows linked accounts and clan of a user.',
    options: {
      user: {
        description: 'User ID or @user mention.'
      }
    }
  },
  nickname: {
    description: 'Configure automatic server nickname settings.',
    config: {
      description: 'Configure automatic server nickname settings.',
      description_long: 'Configure automatic server nickname settings.',
      options: {
        family_nickname_format: {
          description: 'Set family nickname format (e.g. {CLAN} | {ALIAS} | {TH} | {ROLE} | {NAME})'
        },
        non_family_nickname_format: {
          description: 'Set non-family nickname format (e.g. {NAME} | {TH})'
        },
        change_nicknames: {
          description: 'Whether to update nicknames automatically.'
        },
        account_preference_for_naming: {
          description: 'Whether to use the default account or the best account in the family.',
          choices: {
            default_account: 'Default Account',
            best_account: 'Best Account',
            default_or_best_account: 'Default or Best Account'
          }
        }
      }
    }
  },
  reminders: {
    description: 'Setup reminders for clan wars, capital raids.',
    create: {
      description: 'Create reminders for clan wars, capital raids or clan games.',
      description_long: 'Create reminders for clan wars, capital raids or clan games.',
      options: {
        type: {
          description: 'Type of the reminder.',
          choices: {
            clan_wars: 'Clan wars',
            capital_raids: 'Capital raids',
            clan_games: 'Clan games'
          }
        },
        duration: {
          description: 'Remaining duration to mention members (e.g. 6h, 12h, 1d, 2d)'
        },
        message: {
          description: 'Reminder message for the notification.'
        },
        exclude_participants: {
          description: 'Whether to exclude participant list and only include the message (clan wars only)'
        },
        clans: {
          description: 'Clan tags or aliases.'
        },
        channel: {
          description: 'Reminder channel for the notification.'
        }
      },
      max_limit: 'You can only have 25 reminders.',
      invalid_duration_format: 'The duration must be in a valid format. e.g. 2h, 2.5h, 30m',
      no_message: 'You must specify a message to execute this command.',
      duration_limit: 'The duration must be greater than 15 minutes and less than 48 hours.',
      duration_order: 'Duration must be a multiple of 15 minutes. e.g. 15m, 30m, 45m, 1h, 1.25h, 1.5h, 1.75h',
      too_many_clans:
        "The clan selection menu is not available for more than 25 clans. {{clans}} clans were selected automatically!\nTo create a reminder for specific clans, pass clan tags or aliases through the 'clans' option while executing the command.",
      too_many_webhooks: 'Too many webhooks in {{channel}}.',
      success: 'Successfully saved!'
    },
    edit: {
      description: 'Edit a reminder by ID (do /reminders list to get the ID)',
      description_long: 'Edit a reminder by ID (do */reminders list* to get the ID)',
      options: {
        id: {
          description: 'Reminder ID.'
        }
      }
    },
    delete: {
      description: 'Delete a reminder by ID (do /reminders list to get the ID)',
      description_long: 'Delete a reminder by ID (do */reminders list* to get the ID)',
      options: {
        id: {
          description: 'Reminder ID.'
        },
        clear: {
          description: 'Whether to clear all reminders.'
        }
      },
      no_reminders: 'You have no reminders.',
      cleared: 'Successfully cleared all reminders.',
      not_found: 'No reminder was found with the ID {{id}}.',
      success: 'Successfully deleted the reminder with the ID {{id}}.',
      too_many_reminders: 'If you have too many reminders, please provide a reminder ID.'
    },
    list: {
      description: 'List all reminders.',
      description_long: 'List all war reminders for clan wars, capital raids or clan games.',
      no_reminders: 'You have no reminders.',
      options: {
        compact_list: {
          description: 'Show a compact list of the reminders and disable ephemeral.'
        },
        reminder_id: {
          description: 'List a reminder by ID (do /reminders list to get the ID)'
        }
      }
    },
    now: {
      description: 'Create an instant reminder to notify members.',
      description_long: 'Create an instant reminder to notify members.',
      options: {
        message: {
          description: 'Reminder message for the notification.'
        },
        clans: {
          description: 'Clan tags or aliases.'
        }
      },
      no_message: 'You must specify a message to execute this command.',
      no_match: 'There are no wars or no members that are matching with the selected options.'
    }
  },
  history: {
    description: 'Clan Games, Capital Raids, Donations, and CWL attacks history.',
    options: {
      option: {
        description: 'Select an option.',
        choices: {
          clan_games: 'Clan games',
          capital_raids: 'Capital raids',
          capital_contribution: 'Capital contribution',
          cwl_attacks: 'CWL attacks',
          war_attacks: 'War attacks',
          donations: 'Donations/Received',
          attacks: 'Attacks/Defenses',
          loot: 'Loot (Gold/Elixir/Dark)',
          join_leave: 'Join/Leave',
          legend_attacks: 'Legend attacks',
          eos_trophies: 'Season end trophies'
        }
      },
      clans: {
        description: 'Select clans for the history.'
      },
      player: {
        description: 'Select a player for the history.'
      },
      user: {
        description: 'Select a user for the history.'
      }
    }
  },
  army: {
    description: 'Parse an army composition link.',
    description_long: 'Parse an army composition link.',
    no_link: 'You must provide a valid army composition link.',
    invalid_link: 'This army composition link is invalid.',
    possibly_invalid_link: 'This link is invalid and may not work.',
    options: {
      link: {
        description: 'Army composition link.'
      },
      name: {
        description: 'An optional name for this army.'
      },
      equipment: {
        description: 'Hero equipment (type anything)'
      },
      pets: {
        description: 'Hero pets (type anything)'
      },
      clan_castle: {
        description: 'Clan castle (type anything)'
      },
      tips: {
        description: 'Some tips (type anything)'
      }
    }
  },
  attacks: {
    description: 'Attack and defense scoreboard of clan members.',
    description_long: 'Displays attack and defense info of clan members.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      season: {
        description: 'The season to show attacks for.'
      }
    }
  },
  defense: {
    options: {
      clan_only: {
        description: 'Only show defense stats for the clan.'
      }
    }
  },
  boosts: {
    description: 'Clan members with active super troops.',
    description_long: 'Displays active super troops of clan members.',
    no_boosts: 'No members are boosting in this clan.',
    no_recent_boosts: 'No recently active members are boosting in this clan.',
    no_unit_boosts: 'No members are boosting {{unit}} in this clan.',
    no_recent_unit_boosts: 'No recently active members are boosting {{unit}} in this clan.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  clan: {
    description: 'Shows clan summary and overview.',
    description_long: 'Shows comprehensive overview of a clan.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      by_player_tag: {
        description: 'Get clan by a player tag.'
      }
    }
  },
  compo: {
    description: 'Displays Town Hall composition of a clan.',
    description_long: 'Shows Town Hall composition of a clan.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  donations: {
    description: 'Displays donations of clan members.',
    description_long: 'Displays donation/received of clan members.',
    no_season_data: 'No data was found for the season {{season}}.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      season: {
        description: 'The season to show donations for.'
      },
      user: {
        description: 'Donation history of a linked user.'
      },
      player: {
        description: 'Donation history of a player.'
      }
    }
  },
  caller: {
    description: 'Manage the war base caller.',
    options: {
      assign: {
        description: 'Set a target for a player in the current war.',
        options: {
          defense_target: {
            description: 'The base target # of your opponent.'
          },
          offense_target: {
            description: 'The base target # of your clan.'
          },
          notes: {
            description: 'Notes to add to the target.'
          },
          hours: {
            description: 'The number of hours to set the target for.'
          }
        }
      },
      clear: {
        description: 'Clear the target for a player in the current war.',
        options: {
          defense_target: {
            description: 'The base target # of your opponent.'
          }
        }
      }
    }
  },
  lineup: {
    description: 'War line-up of a clan.',
    description_long: 'Displays war line-up of a clan.',
    not_in_war: 'The clan is not in a war.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  members: {
    description: 'Get a clan member list with heroes, trophies, war preferences and much more.',
    description_long:
      'List clan members sorted by heroes, trophies, war preferences, discord links, clan roles, player tags, attacks, etc.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      option: {
        description: 'Select an option.'
      }
    }
  },
  player: {
    description: 'Player summary and overview.',
    description_long: 'Shows comprehensive overview of a player (including war attack history)',
    options: {
      tag: {
        description: 'Player tag or @user mention.'
      }
    }
  },
  remaining: {
    description: 'Remaining or missed attacks of a clan.',
    description_long: 'Shows remaining or missed war hits of a clan.',
    not_in_war: 'Clan is not in a war.',
    no_war_id: 'No war was found for the specified war ID.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      war_id: {
        description: 'Search by war ID.'
      },
      type: {
        description: 'The type of remaining tasks to show.',
        choices: {
          war_attacks: 'War attacks',
          clan_games: 'Clan games',
          capital_raids: 'Capital raids'
        }
      },
      player: {
        description: 'Remaining attacks of a player.'
      },
      user: {
        description: 'Remaining attacks of a linked user.'
      }
    }
  },
  rushed: {
    description: 'Rushed units of a player or clan members.',
    description_long: 'Rushed units and rushed % of a player or clan members.',
    no_rushed: 'No rushed units for Town Hall {{townhall}}.',
    options: {
      tag: {
        description: 'Player tag or @user mention.'
      },
      clan: {
        description: 'Displays rushed units of a clan.'
      }
    }
  },
  search: {
    description: 'Search clans by name.',
    description_long: 'Search clans by name.',
    no_results: 'No results were found.',
    searching: "Clans with the name '{{name}}'.",
    options: {
      name: {
        description: 'Clan name (must be 3 characters long)'
      }
    }
  },
  stats: {
    description: 'Shows attack and defense stats of clan members.',
    no_stats: 'No stats are available for this filter or clan.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      compare: {
        description: 'Compare Town Halls (e.g. 14vs13, *vs15, all, equal)'
      },
      stars: {
        description: 'War stars earned. (Default: 3)'
      },
      type: {
        description: 'War Type [e.g. Regular, CWL, Friendly] (Default: Regular and CWL)',
        choices: {
          regular: 'Regular',
          cwl: 'CWL',
          friendly: 'Friendly',
          noFriendly: 'Regular and CWL',
          noCWL: 'Regular and Friendly',
          all: 'Regular, CWL and Friendly'
        }
      },
      season: {
        description: 'Retrieve data since the specified season.'
      },
      attempt: {
        description: 'Fresh attacks or clean-up attacks. (Default: Both)',
        choices: {
          fresh: 'Fresh',
          cleanup: 'Cleanup'
        }
      },
      days: {
        description: 'Number of days to include (last x days of wars)'
      },
      wars: {
        description: 'Number of last wars to include.'
      },
      filter_farm_hits: {
        description: 'Filter out farm hits (1 star and < 50% destruction)'
      },
      clan_only: {
        description: "Only include the specified clan's war attacks."
      }
    },
    attacks: {
      description: 'Shows attack success rates of clan members.',
      description_long: 'Shows attack success rates of clan members.'
    },
    defense: {
      description: 'Shows defense failure rates of clan members.',
      description_long: 'Shows defense failure rates of clan members.'
    }
  },
  units: {
    description: 'Shows units of a player with max/min levels.',
    description_long: 'Shows home village and builder base units of a player (with max/min levels)',
    options: {
      tag: {
        description: 'Player tag or @user mention.'
      }
    }
  },
  upgrades: {
    description: 'Remaining upgrades of a player with upgrading cost.',
    description_long: 'Remaining upgrades of a player with upgrading cost.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  war: {
    description: 'Shows war summary and overview.',
    description_long: 'Shows war overview of a clan.',
    no_war_id: 'No war was found for the specified war ID.',
    not_in_war: 'Clan is not in a war.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      },
      war_id: {
        description: 'Search by war ID.'
      }
    }
  },
  warlog: {
    description: 'Shows the last 10 clan war logs.',
    description_long: 'Shows last 10 war logs of a clan.',
    options: {
      tag: {
        description: 'Clan tag or alias or @user mention.'
      }
    }
  },
  setup: {
    description: 'Enable/disable features on the server or add/remove clans.',
    enable: {
      description: 'Enable a feature on the server or add a clan.',
      description_long:
        'Enable a feature on the server (War Feed, Last Seen, Clan Games, Legend Log, Capital Log, Clan Feed, Join/Leave Log, Clan Embed, Donation Log) or add a clan or link a clan to a channel.',
      options: {
        option: {
          description: 'Select an option.',
          choices: {
            link_clan: 'Server Link',
            link_channel: 'Channel Link',
            enable_logs: 'Logs / Feed (New)',
            war_feed: 'War Feed',
            last_seen: 'Last Seen',
            clan_games: 'Clan Games',
            legend_log: 'Legend Log',
            capital_log: 'Capital Log',
            clan_feed: 'Clan Feed',
            join_leave: 'Join/Leave Log',
            clan_embed: 'Clan Embed',
            donation_log: 'Donation Log'
          }
        },
        tag: {
          description: 'Tag of the clan.'
        },
        channel: {
          description: 'Channel to send updates to (defaults to the current channel)'
        },
        color: {
          description: 'Hex color code (only for donation log, clan games, last seen and clan embed)'
        },
        role: {
          description: 'Role for the flag notification (only for clan feed)'
        },
        category: {
          description: 'Category of the clan. (select from the menu or type your own)'
        }
      },
      no_leader_link: 'Clan Leader must be linked to the bot to enable this feature.',
      too_many_webhooks: 'Too many webhooks in {{channel}}.',
      server_link: {
        success: 'Successfully linked {{clan}} to {{guild}}.',
        already_linked: '{{clan}} is already linked to {{guild}}.'
      },
      channel_link: {
        description: 'Link a channel to a clan.',
        already_linked: '{{clan}} is already linked to {{channel}}.',
        success: 'Successfully linked {{clan}} to {{channel}}.'
      }
    },
    disable: {
      description: 'Disable a feature on the server or remove a clan.',
      description_long: 'Disable a feature on the server or remove a clan.',
      options: {
        option: {
          description: 'Select an option.',
          choices: {
            unlink_channel: 'Channel link',
            delete_clan: 'Delete clan',
            disable_logs: 'Logs / Feed (New)',
            war_feed: 'War feed',
            last_seen: 'Last seen',
            clan_games: 'Clan games',
            legend_log: 'Legend log',
            capital_log: 'Capital log',
            clan_feed: 'Clan feed',
            join_leave: 'Join/Leave log',
            clan_embed: 'Clan embed',
            donation_log: 'Donation log'
          }
        },
        tag: {
          description: 'Tag of the clan.'
        },
        channel: {
          description: 'Channel to be removed.'
        }
      },
      channel_unlink: 'Successfully unlinked {{clan}} from {{channel}}.',
      channel_not_found: 'No clans were found that are linked to {{channel}}.',
      clan_not_linked: 'No clans were found on the server for the specified tag.',
      clan_deleted: 'Successfully deleted {{clan}}.',
      feature_disabled: 'Successfully disabled {{feature}} for {{clan}}.'
    },
    list: {
      description: 'List all enabled features and clans.',
      description_long: 'List all enabled features and clans.',
      options: {
        clans: {
          description: 'Select the clans to list.'
        }
      }
    },
    utils: {
      description: 'Setup other utility features (link button, events schedular)',
      description_long: 'Setup other utility features (link button, events schedular)',
      options: {
        option: {
          choices: {
            link_button: 'Link button',
            role_refresh_button: 'Role refresh button',
            events_schedular: 'Events schedular',
            flag_alert_log: 'Flag alert log',
            roster_change_log: 'Roster change log',
            reminder_ping_exclusion: 'Reminder ping exclusion',
            maintenance_break_log: 'Maintenance break log'
          }
        },
        disable: {
          description: 'Disable a scheduled event.'
        }
      }
    },
    buttons: {
      description: 'Setup buttons for the server.',
      options: {
        button_type: {
          description: 'Select the button type to setup',
          choices: {
            link_button: 'Link button',
            role_refresh_button: 'Role refresh button'
          }
        },
        disable: {
          description: 'Disable the events schedular'
        }
      }
    },
    events: {
      description: 'Setup automatic events for the server.',
      options: {
        disable: {
          description: 'Disable the events schedular.'
        }
      }
    },
    server_logs: {
      description: 'Setup automatic logs for the server.',
      options: {
        log_type: {
          description: 'Select the log type to setup.',
          choices: {
            flag_alert_log: 'Flag alert log',
            roster_change_log: 'Roster change log',
            maintenance_break_log: 'Maintenance break log'
          }
        },
        disable: {
          description: 'Disable the events schedular'
        }
      }
    },
    clan_logs: {
      description: 'Setup automatic logs for the clan.',
      options: {
        clan: {
          description: 'Select the clan to setup logs.'
        },
        action: {
          description: 'What logs to enable or disable.',
          choices: {
            enable_logs: 'Enable',
            disable_logs: 'Disable'
          }
        }
      }
    }
  },
  category: {
    description: 'Manage clan categories or groups.',
    options: {
      create: {
        description: 'Create a new clan category.',
        options: {
          category_name: {
            description: 'Name of the clan category.'
          }
        }
      },
      list: {
        description: 'List all clan categories.'
      },
      edit: {
        description: 'Edit a clan category.',
        options: {
          category: {
            description: 'Select a clan category.'
          },
          category_name: {
            description: 'Name of the clan category.'
          }
        }
      },
      delete: {
        description: 'Delete a clan category.',
        options: {
          category: {
            description: 'Select a clan category.'
          }
        }
      }
    }
  },
  autorole: {
    description: 'Enable automatic clan roles and Town Hall roles',
    no_roles: 'You must specify 4 roles to execute this command.',
    no_system_roles: 'System managed or bot roles are not allowed.',
    no_higher_roles: 'My highest role must be higher than these roles.',
    invalid_clan_tag: 'The specified clan tag is invalid.',
    roles_already_used:
      'Some roles have already been used for another clan. \nPlease consider supporting us on [Patreon](https://patreon.com/clashperk) to use the same roles for multiple clans.',
    clan_not_linked: 'The clan must be linked to the server to enable auto-role.',
    success_with_count: 'Successfully enabled auto-role for {{count}} clan(s). \n{{clans}}',
    clan_roles: {
      description: 'Enable automatic clan roles.',
      description_long: 'Manage automatic role management for clan roles.',
      options: {
        member: {
          description: 'The Member role (below Elder)'
        },
        elder: {
          description: 'The Elder role.'
        },
        co_lead: {
          description: 'The Co-Leader role.'
        },
        leader: {
          description: 'The Leader role.'
        },
        clans: {
          description: 'Clan tags or aliases.'
        },
        common_role: {
          description: 'Clan role for everyone in the clan.'
        },
        only_verified: {
          description: 'Roles will be given to the verified players only. (API token verification is required)'
        }
      }
    },
    leagues: {
      description: 'Set leagues roles.',
      description_long: 'Manage automatic role management for leagues.'
    },
    builder_leagues: {
      description: 'Set builder base league roles.'
    },
    town_hall: {
      description: 'Manage automatic Town Hall roles.',
      description_long: 'Manage automatic role management for town hall levels.',
      options: {
        allow_non_family_accounts: {
          description: 'Whether to give roles to the members that are not in the family clans.'
        }
      }
    },
    builder_hall: {
      description: 'Manage automatic Builder Hall roles.'
    },
    wars: {
      description: 'Set automatic war roles.',
      options: {
        role: {
          description: 'The war role.'
        },
        clan: {
          description: 'The clan for which to set the war role.'
        }
      }
    },
    eos_push: {
      description: 'Set end of season push roles.',
      options: {
        role: {
          description: 'The end of season push role.'
        },
        clans: {
          description: 'The clans for which to set the end of season push role.'
        }
      }
    },
    family: {
      description: 'Set family roles.',
      options: {
        family_leaders_role: {
          description: 'Family leaders role.'
        },
        family_role: {
          description: 'Family role.'
        },
        exclusive_family_role: {
          description: 'Exclusive family role.'
        },
        guest_role: {
          description: 'Guest role.'
        },
        verified_role: {
          description: 'Verified role.'
        }
      }
    },
    list: {
      description: 'List all auto roles and settings.'
    },
    disable: {
      description: 'Disable automatic clan roles.',
      description_long: 'Disable automatic role management for clan roles, town hall levels, or leagues.',
      options: {
        type: {
          description: 'Type of roles to disable.',
          choices: {
            clan_roles: 'Clan roles',
            town_hall: 'Town Hall roles',
            leagues: 'Leagues roles',
            builder_hall: 'Builder Hall roles',
            builder_leagues: 'Builder leagues roles',
            wars: 'War roles',
            eos_push: 'End of season push roles',
            family_leaders: 'Family leaders role',
            family: 'Family roles',
            exclusive_family: 'Exclusive family role',
            guest: 'Guest role',
            verified: 'Verified role'
          }
        },
        clans: {
          description: 'Clan tags or aliases to filter clans.'
        },
        clear: {
          description: 'Clear all roles from all clans.'
        }
      },
      success_with_count: 'Auto-role has been disabled for {{count}} clan(s). \n{{clans}}'
    },
    refresh: {
      description: 'Refresh roles manually.',
      description_long: 'Refresh roles manually. (Use this command if roles are not updated automatically)',
      options: {
        user_or_role: {
          description: 'Refresh an individual user or a role.'
        },
        is_test_run: {
          description: 'Test run to see the changes without applying.'
        },
        force_refresh: {
          description: 'Whether to bypass delays and force refresh roles.'
        }
      }
    },
    config: {
      description: 'Manage automatic roles settings.',
      options: {
        auto_update_roles: {
          description: 'Whether to update roles automatically.'
        },
        role_removal_delays: {
          description: 'Whether to delay the removal of roles.',
          choices: {
            off: 'Off'
          }
        },
        role_addition_delays: {
          description: 'Whether to delay the addition of roles.'
        },
        always_force_refresh_roles: {
          description: 'Whether to enforce role refresh for individual users by default.'
        },
        allow_not_linked: {
          description: 'Whether to allow not linked players to get roles.'
        },
        verified_only_clan_roles: {
          description: 'Whether to grant clans roles to verified players only.'
        }
      }
    }
  },
  summary: {
    description: 'Shows summary of the clan family.',
    options: {
      best: {
        description: 'Shows a summary of best members.',
        options: {
          clans: {
            description: 'Clan tags or aliases.'
          },
          limit: {
            description: 'Number of members to show (Default: 5)'
          },
          order: {
            description: 'Order of the list.',
            choices: {
              desc: 'Descending',
              asc: 'Ascending'
            }
          }
        }
      },
      wars: {
        description: 'Shows a summary of current wars.',
        options: {
          clans: {
            description: 'Clan tags or aliases.'
          }
        }
      },
      compo: {
        description: 'Shows a summary of Town Hall composition.',
        options: {
          clans: {
            description: 'Clan tags or aliases.'
          }
        }
      },
      cwl_ranks: {
        description: 'Shows a summary of CWL ranks.'
      },
      cwl_status: {
        description: 'Shows a summary of CWL spin status.'
      },
      leagues: {
        description: 'Shows a summary of clan leagues.'
      },
      donations: {
        description: 'Shows a summary of donations.'
      },
      attacks: {
        description: 'Shows a summary of multiplayer attacks and defenses.'
      },
      trophies: {
        description: 'Shows a summary of trophies.',
        options: {
          limit: {
            description: 'Limit the number of members.'
          }
        }
      },
      war_results: {
        description: 'Shows a summary of seasonal war results.'
      },
      missed_wars: {
        description: 'Shows a summary of missed wars.'
      },
      capital_raids: {
        description: 'Shows information about capital raids.',
        options: {
          week: {
            description: 'The week to show raids for.'
          }
        }
      },
      capital_contribution: {
        description: 'Shows a summary of capital contributions.',
        options: {
          week: {
            description: 'The week to show capital contributions for.'
          }
        }
      },
      activity: {
        description: 'Shows a summary of clan activity (last seen).'
      },
      clan_games: {
        description: 'Shows a summary of clan games scores.'
      },
      clans: {
        description: 'Shows a summary of family clans.'
      },
      option: {
        description: 'Select an option.'
      },
      season_since: {
        description: 'Retrieve data since the specified season.'
      },
      season: {
        description: 'Retrieve data for the specified season.'
      }
    },
    compo: {
      description: 'Shows a summary of family Town Hall composition.',
      description_long: 'Shows a summary of family Town Hall composition.'
    },
    clans: {
      description: 'Shows a summary of family clans.',
      description_long: 'Shows a summary of family clans.'
    },
    players: {
      description: 'No description.'
    },
    donations: {
      description: 'Shows a summary of donations.',
      description_long: 'Shows a summary of donations.'
    },
    trophies: {
      description: 'Shows a summary of players sorted by trophies.',
      description_long: 'Shows a summary of players sorted by trophies.'
    },
    wars: {
      description: 'Shows a summary of current wars.',
      description_long: 'Shows a summary of current wars.'
    },
    clan_games: {
      description: 'Shows a summary of clan games scores.',
      description_long: 'Shows a summary of clan games scores.',
      min_clan_size: 'You must have a minimum of {{clans}} clans on your server to use this command.',
      scoreboard: 'Based on the highest scores and completion times.',
      performance: 'Based on completing maximum points.'
    },
    war_results: {
      description: 'Shows a summary of seasonal war results.',
      description_long: 'Shows a summary of seasonal war results.'
    },
    best: {
      description: 'Shows a summary of best members.',
      description_long: 'Shows a summary of best members.'
    },
    attacks: {
      description: 'Shows a summary of best attackers.',
      description_long: 'Shows a summary of best attackers.'
    },
    missed_wars: {
      description: 'Shows a summary of missed wars.',
      description_long: 'Shows a summary of missed wars.'
    },
    capital_raids: {
      description: 'Shows a summary of clan capital raids.',
      description_long: 'Shows a summary of clan capital raids.'
    },
    capital_contribution: {
      description: 'Shows a summary of clan capital contribution.',
      description_long: 'Shows a summary of clan capital contribution.'
    },
    activity: {
      description: 'Shows a summary of clan activity (last seen)',
      description_long: 'Shows a summary of clan activity (last seen)'
    },
    cwl_ranks: {
      description: 'Shows a summary of CWL ranks.',
      description_long: 'Shows a summary of CWL ranks.'
    },
    leagues: {
      description: 'Shows a summary of clan leagues (CWL & Clan Capital)',
      description_long: 'Shows a summary of clan leagues (CWL & Clan Capital)'
    }
  },
  help: {
    description: 'Get a list of commands or info about a specific command.',
    description_long: 'Get a list of commands or info about a specific command.',
    options: {
      name: {
        description: 'Name of the command.'
      }
    }
  },
  invite: {
    description: 'Get the bot invite and support server link.',
    description_long: 'Get the bot invite and support server link.'
  },
  redeem: {
    description: 'Redeem or manage a Patreon subscription. (if you wish to support us)',
    description_long: 'Redeem or manage a Patreon subscription. (if you wish to support us)',
    options: {
      disable: {
        description: 'Disable subscription for a server (if subscribed)'
      }
    }
  },
  events: {
    description: 'Shows the next in-game events.'
  },
  whitelist: {
    description: '[Experimental] Whitelist a role or user to use specific commands.',
    options: {
      user_or_role: {
        description: 'User or role to whitelist.'
      },
      command: {
        description: 'Command to whitelist.'
      },
      clear: {
        description: 'Clear the whitelist.'
      },
      list: {
        description: 'List all whitelisted users and roles.'
      }
    }
  },
  clans: {
    description: 'Show all linked clans.'
  },
  layout: {
    description: 'Post a village layout.',
    description_long: 'Post a village layout.',
    options: {
      screenshot: {
        description: 'Screenshot of the layout.'
      },
      layout_link: {
        description: 'Shareable link of the layout.'
      },
      title: {
        description: 'Title of the layout.'
      }
    }
  },
  bot_personalizer: {
    description: 'Build your own Discord bot!',
    options: {
      opt_out: {
        description: 'Opt-out from the custom bot and delete related services.'
      }
    }
  }
} as const;

export default {
  common,
  command
} as const;
