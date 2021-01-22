import pandas as pd 
import plotly.graph_objects as go

def update_figure(fig, path, colors, symbols, dataset_selection, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                  class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                  class3_plot_selection, yaxis_type_selection, xaxis_type_selection):
    fig.data = []

    dataset = pd.read_csv(path + '/data/' + dataset_selection)

    data = dataset.loc[dataset[class1_selection]==class1_plot_selection]

    concentration = [concentration_plot_selection] if concentration_plot_selection else data[concentration_selection].unique()

    for index_concentration, concentration_selected in enumerate(concentration): 

        concentration_data = data.loc[data[concentration_selection]==concentration_selected]
        class2 = [class2_plot_selection] if class2_plot_selection else concentration_data[class2_selection].unique()

        for index_class2, class2_selected in enumerate(class2):
            
            class2_data = concentration_data.loc[concentration_data[class2_selection]==class2_selected]

            if class3_plot_selection :
                class3 = class2_data[class3_selection].unique()

                for index_class3, class3_selected in enumerate(class3):
                    class3_data = class2_data.loc[class2_data[class3_selection]==class3_selected]

                    fig.add_trace(go.Scatter(
                    x = class3_data[time_selection],
                    y = class3_data[y_selection],
                    name = "%s : %s, %s : %s, %s : %s" %(concentration_selection, concentration_selected,class2_selection,
                                                        class2_selected, class3_selection, class3_selected),
                    showlegend = True,
                    visible = True,
                    hovertemplate=(
                    "<b>Measurement </b><br>" +
                    "%s : %s<br>" % (class1_selection, class1_plot_selection) +
                    "%s : %s<br>" % (concentration_selection, concentration_selected) +
                    "%s : %s<br>" % (class2_selection, class2_selected) +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                    mode="markers",
                    marker=dict(
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
                    )
                ))
            else:
                fig.add_trace(go.Scatter(
                    x = class2_data[time_selection],
                    y = class2_data[y_selection],
                    name = "%s : %s, %s : %s" %(concentration_selection, concentration_selected,class2_selection, class2_selected),
                    showlegend = True,
                    visible = True,
                    hovertemplate=(
                    "<b>Measurement </b><br>" +
                    "%s : %s<br>" % (class1_selection, class1_plot_selection) +
                    "%s : %s<br>" % (concentration_selection, concentration_selected) +
                    "%s : %s<br>" % (class2_selection, class2_selected) +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                    mode="markers",
                    marker=dict(
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
                    )
                ))

    fig.update_layout(
    autosize=True,
    xaxis_title='Time in hours',
    yaxis_title=y_selection,
    xaxis_type = xaxis_type_selection,
    yaxis_type = yaxis_type_selection,
    template="plotly_white",
    ),

    return fig
