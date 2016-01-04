var gridData, rowLabels, colLabels;
var killClick = false;

$(document).ready( function() {
$.event.special.tap.emitTapOnTaphold = false;

  var loadGrid = function() {
    if (localStorage.hasOwnProperty('gridData')) {
      gridData = JSON.parse(localStorage.getItem('gridData'));
      doRest();
    } else {
      $.get('data/starting-grid.dat', function(file) {
        gridData = JSON.parse(file);
        doRest();
      });
    }
  };

  var doRest = function() {
      drawGrid();
      loadLabels();
      createListeners();
  };

  var drawGrid = function() {
    drawRows();
    addColumnSequences();
    setCellStates();
  };

  var drawRows = function() {
    for (var rowIndex in gridData) {
      var row = document.createElement('div');
      $(row).addClass('row');
      $('.grid').append(row);
      drawCells(row, rowIndex);
      addRowSequences(row);
    }
  };

  var drawCells = function(row, rowIndex) {
    for (var cellIndex in gridData[rowIndex]) {
      var cell = document.createElement('div');
      $(cell).addClass('cell');
      $(row).append(cell);
    }
  };

  var addRowSequences = function(row) {
    var sequence = document.createElement('div');
    $(sequence).addClass('sequence');
    $(row).append(sequence);
  };

  var addColumnSequences = function() {
    var seqRow = document.createElement('div');
    $(seqRow).addClass('column-sequence');
    $('.grid').append(seqRow);
    for (var i in gridData) {
      var seqCell = document.createElement('div');
      $(seqCell).addClass('vertical sequence');
      $(seqRow).append(seqCell);
    }
  };

  var setCellStates = function() {
    $('.cell').each( function(index) {
      if (gridData[getCoords(index).x][getCoords(index).y] > 1) {
        $(this).addClass('locked');
      }
    });
    setCellColors();
  };

  var setCellColors = function() {
    $('.cell').css('background-color', function(index) {
      return gridData[getCoords(index).x][getCoords(index).y] % 2 === 1 ? 'black' : 'white';
    });
  };

  var loadLabels = function() {
    $.get('data/row-labels.dat', function(rowData) {
      rowLabels = JSON.parse(rowData);

      $.get('data/column-labels.dat', function(colData) {
        colLabels = JSON.parse(colData);
        updateSequences();
      });
    });
  };

  var countGridSequences = function(gridData) {
    var gridSequences = [];
    for (var row in gridData) {
      gridSequences.push(countRowSequences(gridData[row]));
    }
    return gridSequences;
  };

  var transposeGrid = function(grid) {
    var tGrid = [];
    for (var i = 0; i < grid[0].length; i++) {
      tGrid.push([]);
      for (var row in grid) {
        tGrid[i].push(grid[row][i]);
      }
    }
    return tGrid;
  };

  var countRowSequences = function(rowData) {
     var countVal = 0;
     var seq = [];
     for (var i in rowData) {

       if (rowData[i] % 2 === 1) {
         countVal ++;
       } else {
         if (countVal > 0) {
           seq.push(countVal);
         }

         countVal = 0;
       }
     }
     if (countVal > 0) {
       seq.push(countVal);
     }
     countVal = 0;
     return seq;
  };

  var listsMatch = function(a, b) {
    a = a || [];
    b = b || [];
    var good = true;
    if (a.length === b.length) {
      for (var i in a) {
        if (a[i] != b[i]) {
          good = false;
        }
      }
    } else {
      good = false;
    }
    return good;
  };

  var updateSequences = function() {
    $('.sequence').each( function(index) {
      var seqArr = rowLabels[index];
      var realSeqArr = countRowSequences(gridData[index]);

      var seqStr = '&nbsp;';
      for (var i in seqArr) {
        seqStr += seqArr[i];
        seqStr += ' ';
      }
      $(this).html(seqStr);
      $(this).css('color', function() {
        return listsMatch(seqArr, realSeqArr) ? 'green' : 'red';
      });
    });

    $('.vertical').each( function(index) {
      var seqArr = colLabels[index];
      var realSeqArr = countRowSequences(transposeGrid(gridData)[index]);
      var seqStr = "";
      for (var i in seqArr) {
        seqStr += seqArr[i];
        seqStr += '<br />';
      }
      $(this).html(seqStr);
      $(this).css('color', function() {
        return listsMatch(seqArr, realSeqArr) ? 'green' : 'red';
      });
    });
  };

  var createListeners = function() {
    $('#undo-btn').click(function(e) {
      e.preventDefault();
      undo();
    });

    $('#redo-btn').click(function(e) {
      e.preventDefault();
      redo();
    });

    $('#reset-btn').click(function(e) {
      e.preventDefault();
      reset();
    });

    $('#help-btn').click( function(e) {
      e.preventDefault();
      toggleHelpHeading();
    });

    $('.cell').each( function(index) {
      $(this).on('taphold', function(evt) {
          killClick = true;
          toggleLocked(index);
        });

      $(this).click(function(evt) {
        if (killClick) {
          killClick = false;
          return;
        }
        if (isUnlocked(index)) {
          toggleCell(index);

        }
        updateSequences();
        saveChanges();
      });
    });
  };

  var toggleHelpHeading = function() {
    $('.heading').toggleClass('hidden');
    toggleHelpButtonText();
  };

  var toggleHelpButtonText = function() {
    if ($('.heading').hasClass('hidden'))  {
      $('#help-btn').html('Help');
    } else {
      $('#help-btn').html('Hide help');
    }
  };

  var toggleCell = function(index, isUndoAction) {
      savePrevCellState(index, isUndoAction);

    if (cellContents(index) === 1) {
      $('.cell').eq(index).css('background-color', 'white');
      cellContents(index, 0);
    } else {
      $('.cell').eq(index).css('background-color', 'black');
      cellContents(index, 1);
    }
  };

  var isUnlocked = function(index) {
    return cellContents(index) < 2;
  };

  var isLocked = function(index) {
     return !isUnlocked(index);
  };

  var toggleLocked = function(index) {
    savePrevCellState(index);
    var cells = $('.cell').eq(index).toggleClass('locked');
    var x = getCoords(index).x;
    var y = getCoords(index).y;
    switch(gridData[x][y]) {
      case 0: gridData[x][y] = 2;
              saveChanges();
              break;
      case 1: gridData[x][y] = 3;
              saveChanges();
              break;
      case 2: gridData[x][y] = 0;
              saveChanges();
              break;
      case 3: gridData[x][y] = 1;
              saveChanges();
              break;
    }
  };

  var savePrevCellState = function(index, isUndoAction) {
    initLocalStorage('undoStack');
    initLocalStorage('redoStack');

    var stackName = isUndoAction ? 'redoStack' : 'undoStack';
    var stack = JSON.parse(localStorage.getItem(stackName));
    stack.push({'index': index, 'value': cellContents(index)});
    localStorage.setItem(stackName, JSON.stringify(stack));
  };

  var initLocalStorage = function(itemName) {
    if (!localStorage.hasOwnProperty(itemName)) {
      localStorage.setItem(itemName, '[]');
    }
  };

  var undo = function() {
    stackDo('undoStack');
  };

  var redo = function() {
    stackDo('redoStack');
  };

  var stackDo = function(stackName) {
    var stack = JSON.parse(localStorage.getItem(stackName));
    var prevCell = stack.pop();
    if (isLocked(prevCell.index)) {
      toggleLocked(prevCell.index, stackName === 'undoStack');
    } else {
      toggleCell(prevCell.index, stackName === 'undoStack');
    }
    localStorage.setItem(stackName, JSON.stringify(stack));
  };

  var saveChanges = function() {
    localStorage.setItem('gridData', JSON.stringify(gridData));
  };

  var getCoords = function(index) {
    return { x: Math.floor(index/25), y: index%25 };
  };

  var cellContents = function(index, value) {
    if (value !== undefined) {
      gridData[getCoords(index).x][getCoords(index).y] = value;
    } else {
      return gridData[getCoords(index).x][getCoords(index).y];
    }

  };

  var init = function() {
    initLocalStorage('undoStack');
    initLocalStorage('redoStack');
    loadGrid();
  };

  var reset = function() {
    localStorage.removeItem('gridData');
    document.location.reload();
  };

  init();

});
